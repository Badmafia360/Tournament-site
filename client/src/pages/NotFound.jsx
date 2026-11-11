import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="relative mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 py-20 text-center">
      <div className="absolute inset-0 grid-glow opacity-25" />
      <p className="relative font-display text-[120px] font-extrabold italic leading-none text-ember-500/20">
        404
      </p>
      <h1 className="relative -mt-6 font-display text-4xl font-extrabold uppercase tracking-tight text-white">
        Off the map
      </h1>
      <p className="relative mt-3 max-w-md text-sm text-zinc-500">
        This page is outside the safe zone. Head back to the arena and find your next lobby.
      </p>
      <div className="relative mt-6 flex gap-3">
        <Link to="/" className="btn btn-primary">Back to home</Link>
        <Link to="/tournaments" className="btn btn-ghost">Browse tournaments</Link>
      </div>
    </div>
  );
}
