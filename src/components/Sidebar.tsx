import { NavLink } from 'react-router-dom'

export default function Sidebar() {
  return (
    <nav>
      <Section title="画像">
        <Item to="/image/compress" label="圧縮" />
        <Item to="/image/convert" label="変換" />
        <Item to="/image/resize" label="リサイズ" />
      </Section>
      <Section title="動画">
        <Item to="/video/compress" label="圧縮" />
        <Item to="/video/convert" label="変換" />
        <Item to="/video/resize" label="リサイズ" />
      </Section>
    </nav>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="section">
      <div className="section-title">{title}</div>
      <ul className="menu">{children}</ul>
    </div>
  )
}

function Item({ to, label }: { to: string; label: string }) {
  return (
    <li>
      <NavLink to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
        {label}
      </NavLink>
    </li>
  )
}

