import { Link } from 'react-router';

// Placeholder — rebuild from the approved Figma design (seasonal drink, location, socials).
export default function HomePage() {
  return (
    <section className="py-12 text-center">
      <h1 className="text-5xl font-bold">Eisai Studio</h1>
      <p className="mt-4">Matcha pop-up at UCF.</p>
      <Link
        to="/menu"
        className="mt-8 inline-block rounded-full bg-matcha px-6 py-3 text-cream"
      >
        See the menu
      </Link>
    </section>
  );
}
