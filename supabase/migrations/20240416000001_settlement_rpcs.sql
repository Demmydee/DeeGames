-- Phase 5A: Settlement RPCs

-- 1. Atomic Wallet Balance Update (Existing or New)
CREATE OR REPLACE FUNCTION public.update_wallet_balance_atomic(
    p_user_id uuid,
    p_amount numeric,
    p_type text, -- 'available', 'locked'
    p_direction text -- 'increase', 'decrease'
) RETURNS jsonb AS $$
DECLARE
    v_wallet_id uuid;
    v_current_balance numeric;
BEGIN
    SELECT id, 
           CASE WHEN p_type = 'available' THEN available_balance ELSE locked_balance END
    INTO v_wallet_id, v_current_balance
    FROM public.wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
    END IF;

    IF p_direction = 'decrease' AND v_current_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient % balance', p_type;
    END IF;

    IF p_type = 'available' THEN
        UPDATE public.wallets
        SET available_balance = CASE WHEN p_direction = 'increase' THEN available_balance + p_amount ELSE available_balance - p_amount END,
            updated_at = now()
        WHERE id = v_wallet_id;
    ELSE
        UPDATE public.wallets
        SET locked_balance = CASE WHEN p_direction = 'increase' THEN locked_balance + p_amount ELSE locked_balance - p_amount END,
            updated_at = now()
        WHERE id = v_wallet_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'wallet_id', v_wallet_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Atomic Match Settlement
CREATE OR REPLACE FUNCTION public.settle_match_atomic(
    p_match_id uuid,
    p_pay_mode text,
    p_total_pool_kobo bigint,
    p_house_cut_kobo bigint,
    p_net_pool_kobo bigint,
    p_winners_count integer,
    p_losers_count integer,
    p_rankings jsonb,
    p_payouts jsonb
) RETURNS jsonb AS $$
DECLARE
    v_result_id uuid;
    v_payout record;
    v_trans_id uuid;
    v_wallet_id uuid;
BEGIN
    -- 1. Create Match Result
    INSERT INTO public.match_results (
        match_id, pay_mode, total_pool_kobo, house_cut_kobo, net_pool_kobo, 
        winners_count, losers_count, rankings, settlement_status, settled_at
    ) VALUES (
        p_match_id, p_pay_mode, p_total_pool_kobo, p_house_cut_kobo, p_net_pool_kobo,
        p_winners_count, p_losers_count, p_rankings, 'settled', now()
    ) RETURNING id INTO v_result_id;

    -- 2. Record House Revenue
    IF p_house_cut_kobo > 0 THEN
        INSERT INTO public.house_revenue (match_id, match_result_id, amount_kobo)
        VALUES (p_match_id, v_result_id, p_house_cut_kobo);
    END IF;

    -- 3. Process Payouts
    FOR v_payout IN SELECT * FROM jsonb_to_recordset(p_payouts) AS x(
        "userId" uuid, "rank" integer, "wagerKobo" bigint, "payoutKobo" bigint, 
        "isWinner" boolean, "weight" integer, "defeatReason" text
    ) LOOP
        -- Get Wallet
        SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = v_payout."userId" FOR UPDATE;

        -- Release locked wager
        UPDATE public.wallets 
        SET locked_balance = locked_balance - (v_payout."wagerKobo"::numeric / 100.0),
            updated_at = now()
        WHERE id = v_wallet_id;

        -- Create Wager Loss Transaction (if not winner)
        IF NOT v_payout."isWinner" THEN
            INSERT INTO public.wallet_transactions (
                wallet_id, user_id, transaction_type, direction, amount, status, reference, description
            ) VALUES (
                v_wallet_id, v_payout."userId", 'wager_loss', 'debit', (v_payout."wagerKobo"::numeric / 100.0), 
                'completed', 'MATCH_LOSS_' || p_match_id, 'Wager loss for match ' || p_match_id
            ) RETURNING id INTO v_trans_id;
        ELSE
            -- Credit Payout
            UPDATE public.wallets 
            SET available_balance = available_balance + (v_payout."payoutKobo"::numeric / 100.0),
                updated_at = now()
            WHERE id = v_wallet_id;

            INSERT INTO public.wallet_transactions (
                wallet_id, user_id, transaction_type, direction, amount, status, reference, description
            ) VALUES (
                v_wallet_id, v_payout."userId", 'wager_payout', 'credit', (v_payout."payoutKobo"::numeric / 100.0), 
                'completed', 'MATCH_PAYOUT_' || p_match_id, 'Wager payout for match ' || p_match_id
            ) RETURNING id INTO v_trans_id;
        END IF;

        -- Record Payout
        INSERT INTO public.match_payouts (
            match_result_id, match_id, user_id, rank, wager_kobo, weight, payout_kobo, 
            is_winner, defeat_reason, wallet_transaction_id
        ) VALUES (
            v_result_id, p_match_id, v_payout."userId", v_payout."rank", v_payout."wagerKobo", 
            v_payout."weight", v_payout."payoutKobo", v_payout."isWinner", v_payout."defeatReason", v_trans_id
        );
    END LOOP;

    -- 4. Update Match Status
    UPDATE public.matches SET status = 'finished', finished_at = now() WHERE id = p_match_id;

    RETURN jsonb_build_object('success', true, 'result_id', v_result_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Atomic Match Refund
CREATE OR REPLACE FUNCTION public.refund_match_wagers_atomic(
    p_match_id uuid,
    p_wager_kobo bigint
) RETURNS jsonb AS $$
DECLARE
    v_participant record;
    v_wallet_id uuid;
BEGIN
    FOR v_participant IN SELECT user_id FROM public.match_participants WHERE match_id = p_match_id LOOP
        SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = v_participant.user_id FOR UPDATE;

        -- Release locked wager back to available
        UPDATE public.wallets 
        SET locked_balance = locked_balance - (p_wager_kobo::numeric / 100.0),
            available_balance = available_balance + (p_wager_kobo::numeric / 100.0),
            updated_at = now()
        WHERE id = v_wallet_id;

        INSERT INTO public.wallet_transactions (
            wallet_id, user_id, transaction_type, direction, amount, status, reference, description
        ) VALUES (
            v_wallet_id, v_participant.user_id, 'wager_release', 'credit', (p_wager_kobo::numeric / 100.0), 
            'completed', 'MATCH_REFUND_' || p_match_id, 'Wager refund for match ' || p_match_id
        );
    END LOOP;

    UPDATE public.matches SET status = 'cancelled', finished_at = now() WHERE id = p_match_id;
    
    INSERT INTO public.match_results (
        match_id, pay_mode, settlement_status, settled_at
    ) VALUES (
        p_match_id, 'refund', 'refunded', now()
    );

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
