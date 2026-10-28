import { useEffect, useState } from 'react';
import { brand } from '../data/properties';

const links = [
  { href: '#collection', label: 'Residences' },
  { href: '#story', label: 'Story' },
  { href: '#location', label: 'Locations' },
];

export default function Header({ onBook }: { onBook: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className={`site-header${scrolled ? ' is-scrolled' : ''}${open ? ' is-open' : ''}`}>
      <div className="site-header__inner">
        <a className="wordmark" href="#main" aria-label={`${brand.full}, back to top`}>
          {brand.name}
          <span className="wordmark__sub">Estates</span>
        </a>
        <button
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="visually-hidden">{open ? 'Close menu' : 'Open menu'}</span>
          <span aria-hidden="true" className="menu-toggle__bars" />
        </button>
        <nav id="site-nav" className="site-nav" aria-label="Primary">
          <ul>
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={() => setOpen(false)}>{l.label}</a>
              </li>
            ))}
          </ul>
          <button className="btn btn--small btn--dark" onClick={() => { setOpen(false); onBook(); }}>
            Book a Private Viewing
          </button>
        </nav>
      </div>
    </header>
  );
}
