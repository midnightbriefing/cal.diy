"use client";

import type { EmbedProps } from "app/WithEmbedSSR";
import { useSearchParams } from "next/navigation";

import { BookerWebWrapper as Booker } from "@calcom/web/modules/bookings/components/BookerWebWrapper";
import { getBookerWrapperClasses } from "@calcom/features/bookings/Booker/utils/getBookerWrapperClasses";

import type { inferSSRProps } from "@lib/types/inferSSRProps";

import BookingPageErrorBoundary from "@components/error/BookingPageErrorBoundary";

import type { getServerSideProps } from "@server/lib/[user]/[type]/getServerSideProps";

export type PageProps = inferSSRProps<typeof getServerSideProps> & EmbedProps;

export const getMultipleDurationValue = (
  multipleDurationConfig: number[] | undefined,
  queryDuration: string | string[] | null | undefined,
  defaultValue: number
) => {
  if (!multipleDurationConfig) return null;
  if (multipleDurationConfig.includes(Number(queryDuration))) return Number(queryDuration);
  return defaultValue;
};

function Type({ slug, user, isEmbed, booking, isBrandingHidden, eventData, orgBannerUrl }: PageProps) {
  const searchParams = useSearchParams();

  return (
    <BookingPageErrorBoundary>
      <main className={getBookerWrapperClasses({ isEmbed: !!isEmbed })}>
        <Booker
          username={user}
          eventSlug={slug}
          bookingData={booking}
          hideBranding={isBrandingHidden}
          eventData={eventData}
          entity={{ ...eventData.entity, eventTypeId: eventData?.id }}
          // Without this the booker never requests availability on a team page.
          // BookerWebWrapper resolves `props.isTeamEvent ?? !!event.data?.team`,
          // but getPublicEvent reports team context under `entity`, never as a
          // `team` key, so the fallback is always false and the schedule query
          // is built for a user named after the team slug. entity.teamSlug is
          // null on personal events, so this stays correct for both routes.
          isTeamEvent={!!eventData.entity?.teamSlug}
          // This deploy runs only apps/web. apps/api/v2 is a separate
          // application that is not deployed, so /api/v2/* is a hard 404 here.
          // Once isTeamEvent is true the booker prefers the v2 slots endpoint
          // (useApiV2 && isTeamEvent in useSchedule), which silently replaced a
          // working tRPC call with a request to an API that does not exist, and
          // the calendar sat on skeletons. Pinning it false keeps every booking
          // page on the tRPC procedure, which is verified to return correct
          // availability for these team events.
          useApiV2={false}
          durationConfig={eventData.metadata?.multipleDuration}
          orgBannerUrl={orgBannerUrl}
          /* TODO: Currently unused, evaluate it is needed-
           *       Possible alternative approach is to have onDurationChange.
           */
          duration={getMultipleDurationValue(
            eventData.metadata?.multipleDuration,
            searchParams?.get("duration"),
            eventData.length
          )}
        />
      </main>
    </BookingPageErrorBoundary>
  );
}

export default Type;
