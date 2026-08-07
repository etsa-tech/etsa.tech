interface MeetupEventInfo {
  count: number;
  title: string;
  dateTime: string;
}

interface MeetupEventListItem {
  id: string;
  title: string;
  dateTime: string;
  count: number;
  sampleAttendeeNames: string[];
}

const NEXT_DATA_REGEX = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/;

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function extractApolloState(html: string): Record<string, unknown> | null {
  const match = NEXT_DATA_REGEX.exec(html);
  if (!match) return null;
  const nextData = JSON.parse(match[1]);
  return (
    (nextData?.props?.pageProps?.__APOLLO_STATE__ as
      | Record<string, unknown>
      | undefined) ?? null
  );
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

// Meetup server-renders event data into a __NEXT_DATA__ JSON blob, including
// an Apollo GraphQL cache with the RSVP count. This is reachable with a plain
// anonymous fetch. Attendee *names* are not - Meetup redirects the
// /attendees/ sub-page to a login wall - so this only ever returns a count.
export async function getMeetupRsvpCount(
  eventId: string,
): Promise<MeetupEventInfo | null> {
  const groupSlug = process.env.MEETUP_GROUP_SLUG;
  if (!groupSlug || !eventId) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(
      `https://www.meetup.com/${groupSlug}/events/${eventId}/`,
      {
        headers: { "User-Agent": BROWSER_USER_AGENT },
        signal: controller.signal,
      },
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Meetup event page returned ${response.status}`);
    }

    const html = await response.text();
    const apolloState = extractApolloState(html);
    if (!apolloState) {
      throw new Error("Meetup page did not include Apollo state");
    }

    const eventEntry = apolloState[`Event:${eventId}`] as
      | Record<string, unknown>
      | undefined;
    if (!eventEntry) {
      throw new Error(`Event:${eventId} not found in Meetup page data`);
    }

    // The Apollo field key is generated from the query's filter args, e.g.
    // rsvps({"filter":{"rsvpStatus":["YES"]}}) - match loosely instead of
    // hardcoding exact key formatting, which could shift between builds.
    const rsvpKey = Object.keys(eventEntry).find(
      (key) => key.startsWith("rsvps(") && key.includes('"YES"'),
    );
    const rsvpConnection = rsvpKey
      ? (eventEntry[rsvpKey] as { totalCount?: number } | undefined)
      : undefined;

    if (typeof rsvpConnection?.totalCount !== "number") {
      throw new TypeError("Meetup page did not include a YES RSVP count");
    }

    return {
      count: rsvpConnection.totalCount,
      title: typeof eventEntry.title === "string" ? eventEntry.title : "",
      dateTime:
        typeof eventEntry.dateTime === "string" ? eventEntry.dateTime : "",
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("Failed to fetch Meetup RSVP count:", error);
    return null;
  }
}

// The group's events *list* page (unlike a single event page) embeds every
// listed event's title/date/RSVP count in one fetch, plus up to 5 real
// attendee names per event (Rsvp -> Member refs in the Apollo state) -
// anonymously, no login needed. This only covers Meetup's most recent
// ~10 events per list (upcoming or past) - it can't reach older history.
async function fetchMeetupEventsList(
  type: "upcoming" | "past",
): Promise<MeetupEventListItem[]> {
  const groupSlug = process.env.MEETUP_GROUP_SLUG;
  if (!groupSlug) return [];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const url =
      type === "past"
        ? `https://www.meetup.com/${groupSlug}/events/?type=past`
        : `https://www.meetup.com/${groupSlug}/events/`;
    const response = await fetch(url, {
      headers: { "User-Agent": BROWSER_USER_AGENT },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Meetup ${type} events list returned ${response.status}`);
    }

    const html = await response.text();
    const apolloState = extractApolloState(html);
    if (!apolloState) {
      throw new Error("Meetup events list did not include Apollo state");
    }

    const events: MeetupEventListItem[] = [];
    for (const [key, value] of Object.entries(apolloState)) {
      if (!key.startsWith("Event:") || typeof value !== "object" || !value) {
        continue;
      }
      const entry = value as Record<string, unknown>;
      if (entry.__typename !== "Event") continue;

      const going = entry.going as { totalCount?: number } | undefined;
      const rsvpKey = Object.keys(entry).find((k) => k.startsWith("rsvps("));
      const rsvpConnection = rsvpKey
        ? (entry[rsvpKey] as
            | { edges?: { node?: { __ref?: string } }[] }
            | undefined)
        : undefined;

      const sampleAttendeeNames = (rsvpConnection?.edges ?? [])
        .map((edge) => {
          const rsvpRef = edge.node?.__ref;
          const rsvp = rsvpRef
            ? (apolloState[rsvpRef] as
                | { member?: { __ref?: string } }
                | undefined)
            : undefined;
          const memberRef = rsvp?.member?.__ref;
          const member = memberRef
            ? (apolloState[memberRef] as { name?: string } | undefined)
            : undefined;
          return member?.name;
        })
        .filter((name): name is string => Boolean(name));

      events.push({
        id: typeof entry.id === "string" ? entry.id : "",
        title: typeof entry.title === "string" ? entry.title : "",
        dateTime: typeof entry.dateTime === "string" ? entry.dateTime : "",
        count: going?.totalCount ?? 0,
        sampleAttendeeNames,
      });
    }
    return events;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`Failed to fetch Meetup ${type} events list:`, error);
    return [];
  }
}

// Fallback for posts with no stored meetupEventId: search Meetup's recent
// upcoming + past events for a title match. Exact match on normalized title
// first, then a loose substring match (covers "ETSA Monthly Meetup: X"-style
// prefixes some events may have used).
export async function findMeetupEventByTitle(
  postTitle: string,
): Promise<MeetupEventListItem | null> {
  const normalizedTarget = normalizeTitle(postTitle);
  if (!normalizedTarget) return null;

  const [upcoming, past] = await Promise.all([
    fetchMeetupEventsList("upcoming"),
    fetchMeetupEventsList("past"),
  ]);
  const candidates = [...upcoming, ...past];

  const exactMatch = candidates.find(
    (event) => normalizeTitle(event.title) === normalizedTarget,
  );
  if (exactMatch) return exactMatch;

  return (
    candidates.find((event) => {
      const normalizedEvent = normalizeTitle(event.title);
      return (
        normalizedEvent.includes(normalizedTarget) ||
        normalizedTarget.includes(normalizedEvent)
      );
    }) ?? null
  );
}
