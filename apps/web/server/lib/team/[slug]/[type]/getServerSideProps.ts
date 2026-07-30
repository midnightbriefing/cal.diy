// apps/web/server/lib/team/[slug]/[type]/getServerSideProps.ts
//
// Team booking page loader. Cal.com deleted the enterprise team MANAGEMENT
// layer (packages/features/ee) from the open-source repo, but every layer this
// route needs is still AGPL and still shipped:
//   - EventRepository.getPublicEvent() already takes `isTeamEvent`
//   - getPublicEvent() has a full team branch (usersOrTeamQuery)
//   - getAggregatedAvailability() branches on COLLECTIVE / ROUND_ROBIN / isFixed
// So this is the missing 60 lines, not a reimplementation. Passing the team
// slug where a username would go is exactly what getPublicEvent expects when
// isTeamEvent is true.
//
// Deliberately does NOT handle organizations: this instance has none, and the
// org helpers lived in the deleted ee package.
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import { getBookingForReschedule } from "@calcom/features/bookings/lib/get-booking";
import type { getPublicEvent } from "@calcom/features/eventtypes/lib/getPublicEvent";
import { EventRepository } from "@calcom/features/eventtypes/repositories/EventRepository";
import slugify from "@calcom/lib/slugify";
import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

export type PageProps = {
  eventData: NonNullable<Awaited<ReturnType<typeof getPublicEvent>>>;
  booking?: GetBookingType;
  rescheduleUid: string | null;
  bookingUid: string | null;
  // The Booker view keys its profile lookup off `user`; for a team event this
  // is the team slug, which is what getPublicEvent resolved against.
  user: string;
  slug: string;
  isBrandingHidden: boolean;
  isSEOIndexable: boolean | null;
  themeBasis: null | string;
  orgBannerUrl: null;
};

const paramsSchema = z.object({
  slug: z.string().transform((s) => slugify(s)),
  type: z.string().transform((s) => slugify(s)),
});

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { slug: teamSlug, type: eventSlug } = paramsSchema.parse(context.params);
  const session = await getServerSession({ req: context.req });
  const { rescheduleUid, bookingUid } = context.query;

  const eventData = await EventRepository.getPublicEvent(
    {
      username: teamSlug,
      eventSlug,
      isTeamEvent: true,
      org: null,
      fromRedirectOfNonOrgLink: false,
    },
    session?.user?.id
  );

  if (!eventData) {
    return { notFound: true } as const;
  }

  const props: PageProps = {
    eventData,
    user: teamSlug,
    slug: eventSlug,
    // Team-level branding preference travels on the event payload; fall back to
    // showing branding rather than hiding it we cannot tell.
    isBrandingHidden: eventData.hidden === true ? true : false,
    isSEOIndexable: true,
    themeBasis: teamSlug,
    bookingUid: bookingUid ? `${bookingUid}` : null,
    rescheduleUid: rescheduleUid ? `${rescheduleUid}` : null,
    orgBannerUrl: null,
  };

  if (rescheduleUid) {
    const booking = await getBookingForReschedule(`${rescheduleUid}`, session?.user?.id);
    if (booking?.eventType?.disableRescheduling) {
      return { redirect: { destination: `/booking/${rescheduleUid}`, permanent: false } };
    }
    props.booking = booking;
  }

  return { props };
};
