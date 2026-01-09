import { test, expect, request } from "@playwright/test";
import * as path from "path";
import { runSEOChecks } from "../utils/seo-checks";
import { checkBrokenLinks } from "../utils/broken-links";
import { runAccessibilityCheck } from "../utils/accessibility";
import { checkGTMImplementation } from "../utils/gtm-check";
import { gotoAndWait } from "../utils/page-load";
import { formatErrorWithContext, getCurrentUrl } from "../utils/error-handling";
import { getFilePathFromUrl, writeJsonFile } from "../utils/file-utils";
import { mergeTestResults } from "../utils/report-merger";

/**
 * Multi-URL Audit Test
 *
 * Tests multiple URLs and saves merged results (SEO, broken links, accessibility)
 * to individual JSON files named after each URL.
 *
 * URLs can be provided via:
 * 1. Environment variable: MULTI_URL_AUDIT_URLS (comma-separated)
 * 2. Hardcoded array in TEST_URLS below
 */

// Default test URLs - modify this array or use environment variable
const DEFAULT_TEST_URLS = [
  "https://mydreamasian.com/dating/best-gifts-thai-woman-this-national-lovers-day.html",
  "https://mydreamasian.com/dating/bringing-spotlight-middle-child.html",
  "https://mydreamasian.com/dating/celebrating-long-distance-valentines-day.html",
  "https://mydreamasian.com/dating/celebrating-valentines-day-the-filipino-way.html",
  "https://mydreamasian.com/dating/dating-as-a-senior-tips-to-find-an-asian-match-online.html",
  "https://mydreamasian.com/dating/dos-and-donts-when-dating-an-asian-woman-on-valentines.html",
  "https://mydreamasian.com/dating/effective-communication-with-asian-women.html",
  "https://mydreamasian.com/dating/giving-roses-to-asian-women-the-right-way.html",
  "https://mydreamasian.com/dating/heres-know-youre-breadcrumbed.html",
  "https://mydreamasian.com/dating/how-to-recognize-the-breaking-point-in-a-relationship.html",
  "https://mydreamasian.com/dating/impress-asian-women-on-first-date.html",
  "https://mydreamasian.com/dating/index.html",
  "https://mydreamasian.com/dating/makes-slow-burn-trope-special.html",
  "https://mydreamasian.com/dating/matchmaking-over-online-dating-with-asian-women.html",
  "https://mydreamasian.com/dating/museum-date-way-rizz-gen-z.html",
  "https://mydreamasian.com/dating/need-know-micro-cheating.html",
  "https://mydreamasian.com/dating/new-year-tips-for-new-relationships.html",
  "https://mydreamasian.com/dating/things-know-papercut-relationship.html",
  "https://mydreamasian.com/dating/tips-on-dating-a-single-asian-mom.html",
  "https://mydreamasian.com/dating/traits-asian-women-look-for.html",
  "https://mydreamasian.com/dating/unfolding-like-avoidant-partner.html",
  "https://mydreamasian.com/dating/triangle-method-magical-missing-dating-piece.html",
  "https://mydreamasian.com/dating/why-are-filipinas-interested-in-dating-foreigners.html",
  "https://mydreamasian.com/dating/wonders-lowkey-relationship.html",
  "https://mydreamasian.com/dating/yapper-not-bad.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/index.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/tours/american-man-finds-love-with-thai-women-dating-in-bangkok.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/tours/asian-women-expose-why-filipinas-really-date-foreigners.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/tours/bangkok-is-calling-are-you-ready.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/tours/better-in-china-where-chinese-girls-line-up-to-date-you.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/tours/cebus-cupid-call-filipinas-flock-at-private-speed-dating.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/tours/dating-asian-women-what-s-it-really-like.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/tours/filipino-girls-rush-foreigners-at-cebu-speed-dating.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/tours/how-any-man-can-guaranty-a-match-dating-thai-women.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/tours/intense-dating-real-filipinas-dating-in-cebu.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/tours/it-works-dating-100-chinese-women-in-4-hrs.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/tours/odds-on-your-side-100-thai-girls-swarm-foreign-guys.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/tours/outnumbered-filipinas-flock-in-private-dating-events.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/tours/this-is-it-foreigner-finds-filipina-fiance.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/3-tips-older-men-attract-younger-asian-women.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/29-and-ready-single-filipinas-wants-to-meet-you.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/100-ladies-vs-20-men-filipino-women-shocked-foreigners.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/all-asian-women-fear-dating-foreigners-when.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/all-or-nothing-single-filipina-dream-husband-in-cebu.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/are-chinese-women-easy-to-date.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/are-filipinas-used-foreign-men-for-finances.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/are-you-a-filipina-s-ideal-match.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/are-you-too-old-to-date-young-filipinas.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/asian-dating-is-it-easy-to-date-single-mothers.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/asian-dating-why-chinese-women-decisive-to-date-foreigners.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/asian-women-assist-foreigners-in-dating-thai-girls.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/asian-women-s-dating-advice-you-should-be-real.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/asian-women-s-parents-dislike-dating-older-guys.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/asian-women-the-women-of-your-dreams.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/best-way-to-impress-asian-women.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/beyond-stereotypes-why-filipina-single-moms-date-you.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/can-you-decode-filipina-silent-treatment.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/can-you-handle-serious-relationships-with-filipino-women.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/cebu-speed-dating-find-your-filipina-match-in-a-flash.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/china-reopens-borders-men-flock-to-date-chinese-women.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/countless-single-filipinas-only-date-foreigners.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/dating-the-asian-women-of-your-dreams.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/davao-dating-difference-how-filipinas-really-handle-you.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/do-asian-women-prefer-interracial-marriage-wmaf.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/do-filipinas-date-men-living-in-the-philippines.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/effective-way-to-meet-asian-women.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/english-speaking-chinese-girls-never-demand-this.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/escape-from-the-country-chinese-women-seeking-marriage-abroad.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/fashion-dating-advice-for-men-criteria-for-menswear.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/filipinas-expose-dating-foreigners-vs-locals.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/filipinas-like-you-if.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/filipino-girls-honest-dating-confessions.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/filipino-women-make-the-best-dates.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/fly-to-the-philippines-and-meet-filipino-women.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/how-long-do-asian-women-stay-active-on-dating-apps.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/how-long-will-you-court-to-a-chinese-women.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/impressing-asian-women-sending-holiday-gifts.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/increasing-my-chance-on-singles-tours-dating-women-in-china.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/index.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/instant-way-to-communicate-asian-women.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/international-dating-myths-of-asian-women.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/is-it-really-worth-it-dating-asian-women-exposed.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/is-she-the-one-finding-the-filipina-pea-in-your-pod.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/long-distance-relationship-with-asian-women.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/meet-filipino-women-over-30-new-dating-profiles.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/millions-of-chinese-girls-seek-foreigners-outside-asia.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/most-beautiful-women-in-asia.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/newest-filipino-women-over-40-only-want-this.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/not-just-wifey-material-what-filipinas-can-offer-you.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/odds-of-dating-a-filipino-women-philippine-dating.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/philippines-finest-filipinas-in-their-50s-spring-2024.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/romantic-places-to-visit-with-filipinas-cebu-tour.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/seeking-love-with-filipinas.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/serious-filipino-women-seeking-foreign-husband-abroad.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/serious-thai-women-over-30-want-these-men.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/single-asian-women-want-to-date-you.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/single-filipino-women-urge-men-to-visit-cebu-for-this.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/single-marriage-minded-filipino-women-seek-love-abroad.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/speed-dating-took-me-courage-to-date-asian-women.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/stop-doing-this-while-dating-asian-women.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/things-to-know-before-courting-a-filipino-women.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/things-to-prepare-for-solo-travel-dating-chinese-women.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/this-always-attracts-asian-women-dating-in-asia.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/unfiltered-this-is-what-really-matters-to-filipinas.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/what-asian-women-want-after-marriage-international-dating.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/what-do-asian-women-think-about-children.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/what-do-single-filipina-moms-really-offer.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/what-filipino-girls-in-their-30s-demand.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/what-if-filipinas-choose-foreigners-only.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/why-are-foreigners-a-good-choice-for-filipinas.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/why-chinese-women-crave-intimacy.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/why-choose-asian-women-to-be-your-bride.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/why-do-foreigners-marry-filipino-women.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/why-filipinas-over-30-stop-settling-for-less.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/why-kissing-chinese-girls-spell-first-date-mistake.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/why-more-men-want-to-marry-asian-women.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/why-more-thai-women-are-ditching-dating-apps.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/why-single-filipinas-over-30-crave-high-value-men.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/wifey-material-can-asian-women-adapt-to-western-dating.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/will-asian-women-date-any-man.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/you-need-to-give-all-filipinas-speak-out-about-marriage.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/informational/young-chinese-women-seeking-life-partners.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/a-life-changing-experience-dating-100-filipino-women.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/american-men-find-love-in-the-philippines-dating-filipinas.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/an-openness-to-interracial-love-asian-women-speed-dating.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/asian-women-dating-white-men-incompatible.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/asian-women-on-dating-white-men.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/asian-women-on-their-ideal-man.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/avoid-insincere-chinese-women-passport-bros-pov.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/cebu-exposed-why-filipinas-here-stand-out.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/chinese-women-open-to-sexual-topics.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/dating-100-filipinas-in-cebu-nightly.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/dating-filipinas-most-beautiful-asian-girls.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/dating-qanda-dealing-with-filipinas-in-davao-and-cebu.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/filipinas-draw-foreigners-into-philippine-dating.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/filipinas-in-davao-spell-out-the-secret-to-dating-foreigners.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/filipino-women-reveal-their-first-date-ideas-with-foreigners.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/filipino-women-reveal-their-interest-in-foreign-men.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/finding-wife-in-asia-why-filipina-women.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/fly-to-the-philippines-and-meet-filipino-women.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/foreigners-reveal-why-they-re-dating-asian-women.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/from-despair-to-prayer-finding-love-with-asian-brides.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/hidden-desires-of-filipina-single-moms-in-the-philippines.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/how-asian-women-can-get-married-to-foreigners-asian-dating.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/how-i-met-my-filipina-fiance-in-cebu.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/how-i-met-my-filipina-wife-dating-beyond-borders.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/i-prefer-foreigners-why-filipinas-ditch-local-dating.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/i-want-a-rich-man-single-filipino-women-in-davao-tell-all.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/i-want-to-settle-down-single-filipinas-waiting-for-you.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/index.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/just-do-it-how-foreign-men-met-his-future-asian-wife.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/legit-filipino-women-cant-resists-this-kind-of-passport-bro.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/love-at-1st-sight-thailand-meeting-my-asian-wife.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/marrying-filipinas-entire-family-what-you-need-to-know.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/marrying-thai-women-of-your-dreams.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/no-kids-single-asian-women-only-want-foreign-men.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/overwhelmed-in-shanghai-dating-100-chinese-girls.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/proposing-to-my-filipina-fiance-dating-asian-women.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/pursuing-filipinas-over-other-women-asian-dating.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/real-asian-women-behind-dating-apps.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/single-and-searching-asian-women-over-30-cant-find-love.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/single-asian-women-wait-for-foreign-men.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/the-reality-of-marrying-filipinas-passport-bros-pov.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/things-asian-women-love-about-foreigners.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/what-do-filipinas-expect-from-foreigners-wmaf-couples-pov.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/where-asian-women-date-foreigners.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/why-asian-women-prefer-western-men-dating-in-asia.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/why-asian-women-seek-matchmaking-agencies-for-love.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/why-foreigner-finally-dates-asian-women-after-2-months.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/why-many-asian-women-prefer-foreigners.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/why-more-filipino-women-stop-dating-local-men.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/why-more-men-ditching-dating-apps-to-date-asian-women.html",
  "https://mydreamasian.com/my-dream-asian-tour-videos/testimonial/why-younger-asian-women-really-like-older-men.html",
  "https://mydreamasian.com/psychology/attract-shenzhen-women-dating-in-china.html",
  "https://mydreamasian.com/psychology/collaborative-playlist-present-day-love-language.html",
  "https://mydreamasian.com/psychology/index.html",
  "https://mydreamasian.com/psychology/indicators-of-interest-asian-women-show.html",
  "https://mydreamasian.com/realities/asian-dating-differences-from-the-west.html",
  "https://mydreamasian.com/realities/dating-age-gap-asian-women-prefer.html",
  "https://mydreamasian.com/realities/dink-couples-meant-swim-sink.html",
  "https://mydreamasian.com/realities/do-age-gaps-matter-to-asian-women.html",
  "https://mydreamasian.com/realities/gateway-filipino-eldest-daughters-heart.html",
  "https://mydreamasian.com/realities/guide-pulling-heartstrings-thought-daughter.html",
  "https://mydreamasian.com/realities/i-can-fix-him-no-cant.html",
  "https://mydreamasian.com/realities/index.html",
  "https://mydreamasian.com/realities/love-come-manifestation.html",
  "https://mydreamasian.com/realities/love-comes-fully-developed-pre-frontal-cortex.html",
  "https://mydreamasian.com/realities/people-ghost-reasons.html",
  "https://mydreamasian.com/realities/the-reality-of-marrying-an-asian-woman.html",
  "https://mydreamasian.com/realities/what-dating-an-asian-woman-entails.html",
  "https://mydreamasian.com/travel/dating-spots-in-cebu-on-christmas-day.html",
  "https://mydreamasian.com/travel/index.html",
  "https://mydreamasian.com/execu/cost.html",
  "https://mydreamasian.com/execu/meet-our-matchmakers.html",
  "https://mydreamasian.com/execu/professional-matchmaker-plan.html",
  "https://mydreamasian.com/execu/the-process.html",
  "https://mydreamasian.com/execu/why-us.html",
  "https://mydreamasian.com/featured-ladies/MDA-YT045.html",
  "https://mydreamasian.com/featured-ladies/MDA-YT106-YOUNG-Filipinas-Seeking-LOVE.html",
  "https://mydreamasian.com/featured-ladies/MDA-YTProfiles03.html",
  "https://mydreamasian.com/featured-ladies/MDA-YTProfiles04.html",
  "https://mydreamasian.com/featured-ladies/MDA-YTProfiles05.html",
  "https://mydreamasian.com/featured-ladies/MDA-YTProfiles06.html",
  "https://mydreamasian.com/featured-ladies/MDA-YTProfiles07.html",
  "https://mydreamasian.com/featured-ladies/MDA-YTProfiles08.html",
  "https://mydreamasian.com/featured-ladies/philippines-dating-filipina-women-over-50-marriage-matchmakers.html",
];

// Get URLs from environment variable or use defaults
const TEST_URLS_RAW = process.env.MULTI_URL_AUDIT_URLS
  ? process.env.MULTI_URL_AUDIT_URLS.split(",")
      .map((url) => url.trim())
      .filter((url) => url.length > 0)
  : DEFAULT_TEST_URLS;

// Remove duplicate URLs to avoid duplicate test titles
const TEST_URLS = [...new Set(TEST_URLS_RAW)];

// Output directory for reports
const REPORTS_DIR = path.join(process.cwd(), "reports");

test.describe(`Multi-URL Audit Test (${TEST_URLS.length} URLs)`, () => {
  for (const testUrl of TEST_URLS) {
    test(`audit: ${testUrl}`, async ({ page }) => {
      let currentUrl = testUrl;

      try {
        console.log(`\n${"=".repeat(80)}`);
        console.log(`Starting audit for: ${testUrl}`);
        console.log(`${"=".repeat(80)}`);

        // Navigate to the page
        await gotoAndWait(page, testUrl);
        currentUrl = await getCurrentUrl(page);
        console.log(`Successfully loaded: ${currentUrl}`);

        // Run all checks in parallel for faster execution
        const apiRequest = await request.newContext();

        const [seoResults, brokenLinks, accessibilityResults, gtmResult] =
          await Promise.all([
            runSEOChecks(page, {
              checkRobots: true, // Include robots meta tag check
            }),
            checkBrokenLinks(page, apiRequest),
            runAccessibilityCheck(page),
            checkGTMImplementation(page),
          ]);

        // Merge all results
        const mergedReport = await mergeTestResults(
          currentUrl,
          seoResults,
          brokenLinks,
          accessibilityResults,
          page,
          gtmResult
        );

        // Generate filename from URL
        const relativePath = getFilePathFromUrl(currentUrl, "", "json");
        const filePath = path.join(REPORTS_DIR, relativePath);

        // Save merged report to file
        writeJsonFile(filePath, mergedReport);

        console.log(`\n✅ Report saved: ${filePath}`);
        console.log(
          `   Overall Status: ${mergedReport.summary.overallStatus.toUpperCase()}`
        );
        console.log(
          `   SEO: ${mergedReport.seo.passedCount}/${mergedReport.seo.totalCount} passed`
        );
        console.log(
          `   Broken Links: ${mergedReport.brokenLinks.brokenCount} found`
        );
        console.log(
          `   Accessibility: ${
            mergedReport.accessibility.passed ? "PASSED" : "FAILED"
          } (${mergedReport.accessibility.totalViolations} violations)`
        );
        console.log(
          `   GTM: ${mergedReport.gtm.hasGTM ? "FOUND" : "NOT FOUND"}${
            mergedReport.gtm.containerId
              ? ` (${mergedReport.gtm.containerId})`
              : ""
          }`
        );

        // Optionally, you can assert on the results here
        // Uncomment below to fail test if any check fails:
        // expect(mergedReport.summary.overallStatus).toBe('passed');
      } catch (error: any) {
        const finalUrl = await getCurrentUrl(page);
        const errorMessage = formatErrorWithContext(
          testUrl,
          "multi-url audit",
          error
        );
        console.error(`\n❌ Error auditing ${testUrl}:`);
        console.error(errorMessage);
        console.error(`URL before error: ${testUrl}`);
        console.error(`URL after error: ${finalUrl}`);

        // Save error report
        const errorReport = {
          url: testUrl,
          timestamp: new Date().toISOString(),
          error: true,
          errorMessage: error.message,
          errorStack: error.stack,
          finalUrl,
        };
        const relativePath = getFilePathFromUrl(testUrl, "", "json");
        const filePath = path.join(
          REPORTS_DIR,
          `error-${path.basename(relativePath)}`
        );
        writeJsonFile(filePath, errorReport);

        throw error;
      }
    });
  }
});
