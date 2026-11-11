import spinner from '../assets/spinner.svg';

// The site's loading spinner. The image is decorative; pass `label` to also
// announce it to screen readers, or leave it out when the page has its own
// status message.
export default function Spinner({ label }: { label?: string }) {
  return (
    <>
      <img
        src={spinner}
        alt=""
        width={44}
        height={44}
        className="animate-spin motion-reduce:animate-none"
      />
      {label && (
        <p role="status" className="sr-only">
          {label}
        </p>
      )}
    </>
  );
}
