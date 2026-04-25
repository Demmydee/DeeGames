-- Phase 5B: Chess Integration Migration

-- 1. Extend match_results for draws
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='match_results' AND column_name='is_draw') THEN
        ALTER TABLE public.match_results ADD COLUMN is_draw BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='match_results' AND column_name='draw_reason') THEN
        ALTER TABLE public.match_results ADD COLUMN draw_reason TEXT;
    END IF;
END $$;

-- 2. Extend match_payouts for payout_type
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='match_payouts' AND column_name='payout_type') THEN
        ALTER TABLE public.match_payouts ADD COLUMN payout_type TEXT; -- win, loss, draw_refund
    END IF;
END $$;

-- 3. Create draw_offers table
CREATE TABLE IF NOT EXISTS public.draw_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    offered_by_user_id UUID NOT NULL REFERENCES public.users(id),
    status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined, expired
    offered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ
);

-- Refined constraint: One pending offer per match at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_pending_draw_offer_per_match 
ON public.draw_offers (match_id) 
WHERE status = 'pending';

-- 4. Enable RLS on draw_offers
ALTER TABLE public.draw_offers ENABLE ROW LEVEL SECURITY;

-- Draw offers visible to match participants
DROP POLICY IF EXISTS "Draw offers are visible to match participants" ON public.draw_offers;
CREATE POLICY "Draw offers are visible to match participants" ON public.draw_offers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.match_participants
            WHERE match_id = draw_offers.match_id AND user_id = auth.uid()
        )
    );

-- Participants can create draw offers
DROP POLICY IF EXISTS "Participants can create draw offers" ON public.draw_offers;
CREATE POLICY "Participants can create draw offers" ON public.draw_offers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.match_participants
            WHERE match_id = draw_offers.match_id AND user_id = auth.uid()
        )
    );

-- Participants can update their own or received draw offers (to accept/decline)
DROP POLICY IF EXISTS "Participants can update draw offers" ON public.draw_offers;
CREATE POLICY "Participants can update draw offers" ON public.draw_offers
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.match_participants
            WHERE match_id = draw_offers.match_id AND user_id = auth.uid()
        )
    );

-- 5. Updating settle_match_atomic for Draws and Payout Types
DROP FUNCTION IF EXISTS public.settle_match_atomic(uuid, text, bigint, bigint, bigint, integer, integer, jsonb, jsonb, jsonb) CASCADE;
CREATE OR REPLACE FUNCTION public.settle_match_atomic(
    p_match_id uuid,
    p_pay_mode text,
    p_total_pool_kobo bigint,
    p_house_cut_kobo bigint,
    p_net_pool_kobo bigint,
    p_winners_count integer,
    p_losers_count integer,
    p_rankings jsonb,
    p_payouts jsonb, -- array of {userId, rank, wagerKobo, payoutKobo, isWinner, weight, defeatReason, payoutType}
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
    v_transaction_type text;
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
        "isWinner" boolean, "weight" integer, "defeatReason" text, "payoutType" text
    ) LOOP
        -- Lock and select the wallet ID
        SELECT id INTO v_target_w_id FROM public.wallets WHERE user_id = v_p_rec."userId" FOR UPDATE;

        -- Update Wallet Balances
        UPDATE public.wallets 
        SET locked_balance = locked_balance - (v_p_rec."wagerKobo"::numeric / 100.0),
            updated_at = now()
        WHERE id = v_target_w_id;

        v_transaction_type := COALESCE(v_p_rec."payoutType", CASE WHEN v_p_rec."isWinner" THEN 'wager_payout' ELSE 'wager_loss' END);

        IF v_transaction_type = 'wager_loss' THEN
            INSERT INTO public.wallet_transactions (
                wallet_id, user_id, transaction_type, direction, amount, status, reference, description
            ) VALUES (
                v_target_w_id, v_p_rec."userId", 'wager_loss', 'debit', (v_p_rec."wagerKobo"::numeric / 100.0), 
                'completed', 'MATCH_LOSS_' || p_match_id::text, 'Wager loss for match ' || p_match_id::text
            ) RETURNING id INTO v_t_id;
            
            v_final_status := 'defeated';
        ELSE
            -- This includes wager_payout and wager_refund_draw
            UPDATE public.wallets 
            SET available_balance = available_balance + (v_p_rec."payoutKobo"::numeric / 100.0),
                updated_at = now()
            WHERE id = v_target_w_id;

            INSERT INTO public.wallet_transactions (
                wallet_id, user_id, transaction_type, direction, amount, status, reference, description
            ) VALUES (
                v_target_w_id, v_p_rec."userId", v_transaction_type, 'credit', (v_p_rec."payoutKobo"::numeric / 100.0), 
                'completed', 'MATCH_SETTLE_' || p_match_id::text, 'Wager settlement for match ' || p_match_id::text
            ) RETURNING id INTO v_t_id;
            
            v_final_status := CASE WHEN v_p_rec."isWinner" THEN 'winner' ELSE 'active' END;
        END IF;
        
        -- Override status if they left early 
        IF v_p_rec."defeatReason" IS NOT NULL AND v_p_rec."defeatReason" != '' THEN
            v_final_status := v_p_rec."defeatReason";
        END IF;

        -- Update match_participants status ATOMICALLY
        UPDATE public.match_participants 
        SET status = CASE 
            WHEN p_is_draw THEN 'active'
            ELSE v_final_status 
        END
        WHERE match_id = p_match_id AND user_id = v_p_rec."userId";

        -- Record individual payout
        INSERT INTO public.match_payouts (
            match_result_id, match_id, user_id, rank, wager_kobo, weight, payout_kobo, 
            is_winner, defeat_reason, wallet_transaction_id, payout_type
        ) VALUES (
            v_res_id, p_match_id, v_p_rec."userId", v_p_rec."rank", v_p_rec."wagerKobo", 
            v_p_rec."weight", v_p_rec."payoutKobo", v_p_rec."isWinner", v_p_rec."defeatReason", v_t_id, v_p_rec."payoutType"
        );
    END LOOP;

    UPDATE public.matches SET status = 'finished', finished_at = now() WHERE id = p_match_id;

    RETURN jsonb_build_object('success', true, 'result_id', v_res_id);
END;
$$;
