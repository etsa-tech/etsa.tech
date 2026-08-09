export const metadata = {
  title: "LinkedIn Connected",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{
    status?: string;
    speaker?: string;
    error?: string;
  }>;
}

// Public, unauthenticated landing page for the speaker LinkedIn-connect
// flow. Speakers aren't ETSA admins and can't sign into /admin, so the
// callback sends them here instead of back into the admin console.
export default async function LinkedInConnectedPage({
  searchParams,
}: Readonly<PageProps>) {
  const { status, speaker, error } = await searchParams;
  const isSuccess = status === "success";

  return (
    <div className="container py-24 max-w-xl mx-auto text-center">
      {isSuccess ? (
        <>
          <h1 className="text-3xl font-bold text-light-text dark:text-dark-text mb-4">
            You&apos;re connected!
          </h1>
          <p className="text-light-muted dark:text-dark-muted">
            Thanks{speaker ? `, ${speaker}` : ""} - your LinkedIn is now linked.
            Future ETSA posts about your talk will tag you directly instead of
            just linking your profile.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold text-light-text dark:text-dark-text mb-4">
            Something went wrong
          </h1>
          <p className="text-light-muted dark:text-dark-muted mb-2">
            We couldn&apos;t connect your LinkedIn account.
          </p>
          {error && (
            <p className="text-sm text-light-muted dark:text-dark-muted font-mono mb-4">
              {error}
            </p>
          )}
          <p className="text-light-muted dark:text-dark-muted">
            Ask whoever sent you this link for a fresh one, or reach out via{" "}
            <a
              href="/contact"
              className="text-etsa-primary hover:text-etsa-primary-dark underline"
            >
              our contact page
            </a>
            {"."}
          </p>
        </>
      )}
    </div>
  );
}
