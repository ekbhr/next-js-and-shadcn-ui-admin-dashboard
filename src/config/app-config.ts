import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "RevEngine Media",
  version: packageJson.version,
  copyright: `© ${currentYear}, RevEngine Media.`,
  meta: {
    title: "RevEngine Media - Dashboard",
    description:
      "RevEngine Media - Revenue reporting and analytics dashboard for domain monetization.",
  },
};
