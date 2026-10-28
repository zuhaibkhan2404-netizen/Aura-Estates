import { useCallback, useRef, useState } from 'react';
import { initialResidenceIndex, residences } from './data/properties';
import { goTo } from './lib/motion';
import { useScrollReveals } from './lib/reveal';
import Header from './components/Header';
import Hero from './components/Hero';
import Showroom, { type ShowroomHandle } from './components/Showroom';
import ResidenceDetail from './components/ResidenceDetail';
import Story from './components/Story';
import Lifestyle from './components/Lifestyle';
import Location from './components/Location';
import Enquiry from './components/Enquiry';
import Footer from './components/Footer';

const marquee = ['Villas', 'Waterfront', 'Glass houses', 'Retreats', 'By appointment'];

export default function App() {
  const [selected, setSelected] = useState(initialResidenceIndex);
  const [enquiryResidence, setEnquiryResidence] = useState<string>('');
  const showroom = useRef<ShowroomHandle>(null);
  useScrollReveals();

  const bookViewing = useCallback((residenceId?: string) => {
    if (residenceId) setEnquiryResidence(residenceId);
    goTo('enquire', 'h2');
  }, []);

  const backToCollection = useCallback(() => {
    showroom.current?.back();
    goTo('collection');
  }, []);

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <p className="demo-banner" role="note">
        <span className="long">Demonstration site — AUREL Estates and its listings are fictional. Photos are illustrative (Unsplash), not the listed properties.</span>
        <span className="short">Demo site · fictional listings · illustrative photos</span>
      </p>
      <Header onBook={() => bookViewing()} />
      <main id="main" tabIndex={-1}>
        <Hero onExplore={() => goTo('collection')} onBook={() => bookViewing()} />
        <div className="marquee" aria-hidden="true">
          <div className="marquee__track">
            {[0, 1].map((k) => (
              <span key={k}>{marquee.map((m) => <span key={m}>{m}<i>✦</i></span>)}</span>
            ))}
          </div>
        </div>
        <Showroom
          ref={showroom}
          residences={residences}
          selected={selected}
          onSelect={setSelected}
          onBook={(id) => bookViewing(id)}
          onViewDetails={() => goTo('residence', 'h2')}
        />
        <ResidenceDetail
          residence={residences[selected]}
          index={selected}
          total={residences.length}
          onBook={(id) => bookViewing(id)}
          onBack={backToCollection}
        />
        <Story />
        <Lifestyle />
        <Location onSelectResidence={(i) => { setSelected(i); goTo('residence', 'h2'); }} />
        <Enquiry preselectedId={enquiryResidence} />
      </main>
      <Footer />
    </>
  );
}
