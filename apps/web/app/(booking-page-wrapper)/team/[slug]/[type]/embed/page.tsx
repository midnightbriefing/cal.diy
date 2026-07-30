// apps/web/app/(booking-page-wrapper)/team/[slug]/[type]/embed/page.tsx
//
// Required, not optional: vektortms.com/demo books through an iframe embed, so
// without this route the marketing site cannot point at team events at all.
// Byte-for-byte the [user]/[type]/embed page with the team loader swapped in.
import { CustomI18nProvider } from "app/CustomI18nProvider";
import withEmbedSsrAppDir from "app/WithEmbedSSR";
import type { PageProps as ServerPageProps } from "app/_types";
import { cookies, headers } from "next/headers";

import { loadTranslations } from "@calcom/i18n/server";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import { getServerSideProps } from "@server/lib/team/[slug]/[type]/getServerSideProps";

import TypePage, { type PageProps as ClientPageProps } from "~/users/views/users-type-public-view";

export const generateMetadata = async () => {
  return {
    robots: {
      follow: false,
      index: false,
    },
  };
};

const getData = withEmbedSsrAppDir<ClientPageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const context = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const props = await getData(context);

  const locale = props.eventData?.interfaceLanguage;
  if (locale) {
    const ns = "common";
    const translations = await loadTranslations(locale, ns);
    return (
      <CustomI18nProvider translations={translations} locale={locale} ns={ns}>
        <TypePage {...props} />
      </CustomI18nProvider>
    );
  }

  return <TypePage {...props} />;
};

export default ServerPage;
