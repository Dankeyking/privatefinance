import { formatEUR } from '../lib/normalize.js'

// Konto-Karte mit Farbcodierung (joint = Akzent, low/neg = Warnung/Rot).
export default function AccountCard({ account }) {
  const balanceTone = account.balance < 0 ? 'neg' : account.balance < 500 ? 'low' : ''
  return (
    <div className={`card acct ${account.type}`}>
      <div className="acct-type">{account.type === 'joint' ? 'Gemeinschaft' : 'Privat'}</div>
      <div className="acct-name">{account.name}</div>
      <div className="acct-owner">{account.owner}</div>
      <div className={`acct-balance ${balanceTone}`}>{formatEUR(account.balance)}</div>
      {account.iban && <div className="acct-iban">{account.iban}</div>}
    </div>
  )
}
