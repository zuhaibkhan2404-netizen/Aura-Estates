import { brand } from '../data/properties';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div>
          <p className="wordmark wordmark--footer">{brand.name}<span className="wordmark__sub">Estates</span></p>
          <p className="muted">{brand.contactNote}</p>
        </div>
        <nav aria-label="Footer">
          <ul>
            <li><a href="#collection">Residences</a></li>
            <li><a href="#story">Story</a></li>
            <li><a href="#location">Locations</a></li>
            <li><a href="#enquire">Book a viewing</a></li>
          </ul>
        </nav>
        <p className="site-footer__legal">
          {brand.full} is a fictional brand created for demonstration. All residences, locations, figures and
          images are sample content; images are concept renders generated from simplified 3D models. Nothing on
          this site is an offer, valuation or verified listing.
        </p>
      </div>
    </footer>
  );
}
