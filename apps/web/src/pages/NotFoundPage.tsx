import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <section className="py-12 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <Link to="/" className="mt-4 inline-block underline">
        Back home
      </Link>
    </section>
  );
}
