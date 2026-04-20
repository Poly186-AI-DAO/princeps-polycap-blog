import Link from "next/link";

export default function NotFound() {
  return (
    <main className="my-32 w-full dark:bg-dark flex justify-center font-mr">
      <div className="relative flex flex-col items-center justify-center">
        <h1 className={`inline-block text-dark dark:text-light
      text-6xl font-bold w-full capitalize xl:text-8xl text-center`}>404</h1>
        <h2 className={`inline-block text-dark dark:text-light
      text-5xl font-bold w-full capitalize xl:text-6xl text-center mt-4 tracking-wide leading-snug`}>This signal isn&apos;t in the archive yet</h2>
        <p className="mt-4 max-w-xl text-center text-base text-dark/70 dark:text-light/70">
          The page you&apos;re looking for has either moved, been retired, or never made it out of the lab.
        </p>
        <Link
          href="/"
          className="self-center mt-8 inline-block rounded-lg border-2 border-solid bg-dark px-4 py-2
        font-semibold text-light hover:border-dark hover:bg-light hover:text-dark 
        dark:bg-light dark:text-dark hover:dark:bg-dark hover:dark:text-light hover:dark:border-light
        "
        >
          Back to the field notes
        </Link>
      </div>
    </main>
  );
}
