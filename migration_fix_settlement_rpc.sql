-- Update settle_match_atomic to support draws and new parameters
DROP FUNCTION IF EXISTS public.settle_match_atomic(uuid, text, bigint, bigint, bigint, integer, integer, jsonb, jsonb, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.settle_match_atomic(uuid, text, bigint, bigint, bigint, integer, integer, jsonb, jsonb, jsonb, boolean, text) CASCADE;

CREATE OR REPLACE FUNCTION public.settle_match_atomic(
    p_match_id uuid,
    p_pay_mode text,
    p_total_pool_kobo bigint,
    p_house_cut_kobo bigint,
    p_net_pool_kobo bigint,
    p_winners_count integer,
    p_losers_count integer,
    p_rankings jsonb,
    p_payouts jsonb, -- array of {userId, rank, wagerKobo, payoutKobo, isWinner, weight, defeatReason}
    p_history jsonb DEFAULT '[]'::jsonb,
    p_is_draw boolean DEFAULT false,
    p_draw_reason text DEFAULT null
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_res_id uuid;
    v_p_rec record;
    v_t_id uuid;
    v_target_w_id uuid;
    v_final_status text;
BEGIN
    INSERT INTO public.match_results (
        match_id, pay_mode, total_pool_kobo, house_cut_kobo, net_pool_kobo,
        winners_count, losers_count, rankings, history, settlement_status, settled_at,
        is_draw, draw_reason
    ) VALUES (
        p_match_id, p_pay_mode, p_total_pool_kobo, p_house_cut_kobo, p_net_pool_kobo,
        p_winners_count, p_losers_count, p_rankings, p_history, 'settled', now(),
        p_is_draw, p_draw_reason
    ) RETURNING id INTO v_res_id;

    IF p_house_cut_kobo > 0 THEN
        INSERT INTO public.house_revenue (match_id, match_result_id, amount_kobo)
        VALUES (p_match_id, v_res_id, p_house_cut_kobo);
    END IF;

    FOR v_p_rec IN SELECT * FROM jsonb_to_recordset(p_payouts) AS x(
        "userId" uuid, "rank" integer, "wagerKobo" bigint, "payoutKobo" bigint,
        "isWinner" boolean, "weight" integer, "defeatReason" text
    ) LOOP
        -- Lock and select the wallet ID
        SELECT id INTO v_target_w_id FROM public.wallets WHERE user_id = v_p_rec."userId" FOR UPDATE;

        -- Update Wallet Balances
        UPDATE public.wallets
        SET locked_balance = locked_balance - (v_p_rec."wagerKobo"::numeric / 100.0),
            updated_at = now()
        WHERE id = v_target_w_id;

        IF NOT v_p_rec."isWinner" AND NOT p_is_draw THEN
            INSERT INTO public.wallet_transactions (
                wallet_id, user_id, transaction_type, direction, amount, status, reference, description
            ) VALUES (
                v_target_w_id, v_p_rec."userId", 'wager_loss', 'debit', (v_p_rec."wagerKobo"::numeric / 100.0),
                'completed', 'MATCH_LOSS_' || p_match_id::text, 'Wager loss for match ' || p_match_id::text
            ) RETURNING id INTO v_t_id;

            v_final_status := 'defeated';
        ELSE
            -- Payout (either win or draw refund)
            UPDATE public.wallets
            SET available_balance = available_balance + (v_p_rec."payoutKobo"::numeric / 100.0),
                updated_at = now()
            WHERE id = v_target_w_id;

            INSERT INTO public.wallet_transactions (
                wallet_id, user_id, transaction_type, direction, amount, status, reference, description
            ) VALUES (
                v_target_w_id, v_p_rec."userId", CASE WHEN p_is_draw THEN 'wager_refund_draw' ELSE 'wager_payout' END, 'credit', (v_p_rec."payoutKobo"::numeric / 100.0),
                'completed', CASE WHEN p_is_draw THEN 'MATCH_DRAW_' ELSE 'MATCH_PAYOUT_' END || p_match_id::text,
                CASE WHEN p_is_draw THEN 'Draw refund' ELSE 'Match payout' END || ' for match ' || p_match_id::text
            ) RETURNING id INTO v_t_id;

            v_final_status := CASE WHEN p_is_draw THEN 'draw' ELSE 'winner' END;
        END IF;

        -- Override status if they left early (even if it's a draw)
        IF v_p_rec."defeatReason" = 'left' THEN
            v_final_status := 'left';
        ELSIF v_p_rec."defeatReason" = 'time_forfeit' THEN
            v_final_status := 'defeated';
        END IF;

        -- Update match_participants status ATOMICALLY
        UPDATE public.match_participants
        SET status = v_final_status
        WHERE match_id = p_match_id AND user_id = v_p_rec."userId";

        -- Record individual payout
        INSERT INTO public.match_payouts (
            match_result_id, match_id, user_id, rank, wager_kobo, weight, payout_kobo,
            is_winner, defeat_reason, wallet_transaction_id
        ) VALUES (
            v_res_id, p_match_id, v_p_rec."userId", v_p_rec."rank", v_p_rec."wagerKobo",
            v_p_rec."weight", v_p_rec."payoutKobo", v_p_rec."isWinner", v_p_rec."defeatReason", v_t_id
        );
    END LOOP;

    UPDATE public.matches SET status = 'finished', finished_at = now() WHERE id = p_match_id;

    RETURN jsonb_build_object('success', true, 'result_id', v_res_id);
END;
$$;
