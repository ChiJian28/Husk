-- Keep a single open ECDH keypair per wallet (quotation_id IS NULL).
delete from rfq_keypairs a
using rfq_keypairs b
where a.quotation_id is null
  and b.quotation_id is null
  and a.wallet = b.wallet
  and a.created_at < b.created_at;

create unique index if not exists rfq_keypairs_wallet_open
  on rfq_keypairs (wallet)
  where quotation_id is null;
