#!/usr/bin/env node

/**
 * Batch URL Test Runner
 * 
 * Runs npm run test:url for each URL in the URLS array
 * 
 * Usage:
 *   node run-batch-url-tests.js
 * 
 * Or modify the URLS array below with your URLs
 */

const { spawn } = require('child_process');
const path = require('path');

// Array of URLs to test
const URLS = [
  'https://barranquilladating.com/about-barranquilla-brides.html',
  'https://barranquilladating.com/about-barranquilla-dating.html',
  'https://barranquilladating.com/barranquilla-colombia-history.html',
  'https://barranquilladating.com/barranquilla-dating-liveshow.html',
  'https://barranquilladating.com/barranquilla-dating-tours.html',
  'https://barranquilladating.com/barranquilla-marriage-culture-facts.html',
  'https://barranquilladating.com/barranquilla-singles.html',
  'https://barranquilladating.com/barranquilla-women-questions-to-ask.html',
  'https://barranquilladating.com/best-barranquilla-matchmakers-marriage-agency.html',
  'https://barranquilladating.com/colombian-women-marriage-barranquilla-dating.html',
  'https://barranquilladating.com/craigslist-vs-barranquilla-dating.html',
  'https://barranquilladating.com/culture-traditions-barranquilla-colombia.html',
  'https://barranquilladating.com/date-barranquilla-women.html',
  'https://barranquilladating.com/error-404.html',
  'https://barranquilladating.com/find-latin-brides-barranquilla-dating.html',
  'https://barranquilladating.com/how-barranquilla-women-are-in-love.html',
  'https://barranquilladating.com/how-to-meet-single-barranquilla-women.html',
  'https://barranquilladating.com/index.html',
  'https://barranquilladating.com/marry-younger-barranquilla-women.html',
  'https://barranquilladating.com/more-about-single-barranquilla-women.html',
  'https://barranquilladating.com/msg-received.html',
  'https://barranquilladating.com/new-single-girls-for-marriage-worldwide.html',
  'https://barranquilladating.com/newest-latin-women.html',
  'https://barranquilladating.com/newest-singles-barranquilla-dating.html',
  'https://barranquilladating.com/reasons-travel-barranquilla.html',
  'https://barranquilladating.com/search-single-foreign-women-worldwide.html',
  'https://barranquilladating.com/sign-up.html',
  'https://barranquilladating.com/single-barranquilla-girls.html',
  'https://barranquilladating.com/single-women-barranquilla.html',
  'https://barranquilladating.com/travel-tips-barranquilla-colombia.html',
  'https://barranquilladating.com/treelink.html',
  'https://barranquilladating.com/understand-barranquilla-dating-culture.html',
  'https://barranquilladating.com/women-in-barranquilla-dating.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/3-types-colombian-women-barranquilla-women.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/5-ways-to-make-colombian-women-love-you.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/10-stunning-barranquilla-latinas-ready-to-meet-you.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/are-colombian-women-not-attracted-to-african-american-men.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/are-colombianas-dating-foreigners-to-flee-barranquilla.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/average-colombian-girl-stuns-foreign-daters.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/barranquilla-latinas-only-want-foreigners-dating-profiles.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/barranquilla-nightlife-dating-colombian-women.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/barranquilla-revealed-private-dating-colombian-women.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/barranquilla-single-latinas-want-more-men.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/barranquilla-untold-dating-zone-latinas.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/best-christmas-presents-colombian-women-will-love.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/can-i-kiss-colombian-women-on-the-1st-date-latina-cupid-qanda.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/can-you-commit-colombian-latinas-drop-dating-truths.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/captivating-colombian-women-colombian-dating.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/colombian-girls-make-outstanding-wives.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/colombian-girls-real-intentions-dating-mature-men.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/colombian-model-is-ready-for-motherhood-dating-latinas.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/colombian-women-date-men.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/colombian-women-over-30-without-kids.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/colombian-women-over-40-have-different-dating-expectations.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/colombian-women-over-40-seek-love-in-barranquilla.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/dating-app-dangerzone-date-colombian-girls-safer.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/dating-colombian-women-not-from-barranquilla.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/dating-colombian-women-scammers-occur.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/dating-foreigners-in-colombia-as-an-afro-latina.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/dating-younger-colombian-women-20-year-age-gap.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/do-you-meet-the-standards-of-colombian-women.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/dont-date-in-colombia-without-hearing-these-4-dating-tips.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/experienced-matchmaker-spells-out-colombian-girls.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/foreign-mens-comfort-zone-dating-colombian-women.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/foreigners-colombian-dating-survival-guide.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/how-americans-date-dozens-of-barranquilla-latinas.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/i-impulsively-flew-overseas-to-date-colombian-women.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/index.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/man-regrets-hesitating-for-20-years-dating-colombian-women.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/marriage-agency-colombian-womens-safe-zone-dating.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/massive-mistakes-men-make-dating-in-barranquilla.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/meet-colombian-women-barranquilla.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/meet-hot-colombian-women-barranquilla.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/perfect-time-date-latinas-colombia.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/reality-international-dating-colombian-women.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/shocking-colombian-dating-culture-exposed-by-latina.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/stay-cautious-or-go-all-in-dating-colombian-women.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/successful-colombian-businesswoman-wants-a-good-husband.html',
  'https://barranquilladating.com/barranquilla-dating-videos/informational/what-will-colombian-girls-do-for-you-dating-in-colombia.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/3rd-colombia-travel-foreign-men-cant-quit.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/4-things-to-consider-dating-colombian-women.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/4th-trip-to-colombia-dating-colombian-women-for-marriage.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/10-days-dating-colombian-women-long-enough.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/24-hrs-in-barranquilla-changes-everything.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/100-colombian-women-eager-date-barranquilla.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/ambitious-colombian-women-want-you.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/american-dates-more-colombian-women-via-matchmakers.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/american-regrets-waiting-9-years-dating-colombia.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/colombia-tour-amazing-colombian-women.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/colombian-women-confess-how-they-want-to-be-conquered.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/colombian-women-dream-finding-foreigner-husband.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/colombian-women-for-marriage-dating-in-colombia.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/colombian-women-owe-marriage-family-to-real-life-cupid.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/colombian-women-seek-love-beyond-borders.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/colombian-women-travel-64-miles-to-meet-foreign-bachelors.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/dating-100-with-barranquilla-women.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/dating-colombian-girls-the-better-bachelors-way.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/dating-colombian-woman-be-the-man-she-wants.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/dating-most-pursued-brides-colombian-women-in-barranquilla.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/doomed-dating-colombian-women-language-barrier.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/finding-foreign-mens-purpose-colombian-women-dating.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/foreign-man-dating-colombian-women-my-experience.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/foreign-men-and-colombian-womens-sweet-escape-colombia-travel.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/foreign-mens-love-colombian-womens-most-pursued.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/foreigners-win-dating-colombian-women.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/genuinely-interested-dating-colombian-women.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/getting-the-truth-out-of-colombian-girls.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/give-dating-apps-give-dating-colombia.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/go-on-a-dating-tour-with-lots-of-colombian-women.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/he-dated-300-days-in-colombia-wo-apps.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/he-flew-10k-miles-for-that-asian-men-dating-colombian-women.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/his-second-date-in-colombia-changed-everything.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/i-feel-like-a-teenager-dating-colombian-women.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/index.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/instant-way-to-keep-colombian-women-dating-in-barranquilla.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/latin-women-rock-foreign-mans-heart-dating-in-colombia.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/latin-womens-desire-dating-foreign-men.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/latinas-speed-dating-what-to-discover-in-colombia.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/magic-city-of-colombia-nightlife-barranquilla-dating-vlog.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/moving-to-colombia-after-10-days-dating-colombian-women.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/non-stop-excitement-dating-women-in-barranquilla.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/obstacles-of-dating-colombian-women.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/seasoned-traveler-breaks-down-colombian-dating.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/shocking-experiences-dating-colombianas-as-an-atheist.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/take-it-slow-colombian-women-dating-culture.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/talented-latinas-seek-good-men.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/the-hope-for-colombian-women-interracial-marriage.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/this-motivated-me-to-date-colombian-women.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/what-i-like-about-dating-colombian-women-latin-dating.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/which-parts-of-colombian-dating-videos-are-not-true.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/why-colombian-women-get-attracted-with-foreigners.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/why-i-finally-went-to-barranquilla-dating-latinas.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/why-women-join-colombian-dating-agencies.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/would-colombian-women-marry-a-non-catholic-latinas-tell-all.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/would-she-move-to-your-country-ask-colombian-women-anything.html',
  'https://barranquilladating.com/barranquilla-dating-videos/testimonial/you-wont-meet-this-many-colombian-girls-on-dating-apps.html',
  'https://barranquilladating.com/barranquilla-dating-videos/tours/3-reasons-why-you-need-a-latina-gf-dating-colombian-women.html',
  'https://barranquilladating.com/barranquilla-dating-videos/tours/200-colombian-women-in-1-week-passport-bros-dating-tip.html',
  'https://barranquilladating.com/barranquilla-dating-videos/tours/are-colombian-women-easy-to-love-dating-in-barranquilla.html',
  'https://barranquilladating.com/barranquilla-dating-videos/tours/best-way-to-meet-colombian-women-vip-dating-in-barranquilla.html',
  'https://barranquilladating.com/barranquilla-dating-videos/tours/can-you-trust-colombian-women-barranquilla-expat-speaks-out.html',
  'https://barranquilladating.com/barranquilla-dating-videos/tours/colombian-women-exceed-expectations-irl.html',
  'https://barranquilladating.com/barranquilla-dating-videos/tours/dating-colombian-women-barranquilla-colombia-vlog.html',
  'https://barranquilladating.com/barranquilla-dating-videos/tours/dating-in-barranquilla-colombia-as-foreigners.html',
  'https://barranquilladating.com/barranquilla-dating-videos/tours/do-colombian-women-really-want-foreign-men.html',
  'https://barranquilladating.com/barranquilla-dating-videos/tours/enticing-beauty-of-sexy-latinas-how-to-impress-them.html',
  'https://barranquilladating.com/barranquilla-dating-videos/tours/heres-why-you-shouldnt-dm-colombian-women.html',
  'https://barranquilladating.com/barranquilla-dating-videos/tours/how-dating-women-works-for-men-in-colombia.html',
  'https://barranquilladating.com/barranquilla-dating-videos/tours/i-dated-100-women-without-sending-a-single-message.html',
  'https://barranquilladating.com/barranquilla-dating-videos/tours/index.html',
  'https://barranquilladating.com/barranquilla-dating-videos/tours/latin-women-of-barranquilla-colombia.html',
  'https://barranquilladating.com/barranquilla-dating-videos/tours/latinas-approach-foreigners-barranquilla-speed-dating.html',
  'https://barranquilladating.com/barranquilla-dating-videos/tours/meeting-real-colombian-women-in-person.html',
  'https://barranquilladating.com/barranquilla-dating-videos/tours/safe-to-date-in-barranquilla-colombian-women.html',
  'https://barranquilladating.com/barranquilla-dating-videos/tours/speed-dating-100-colombia-women-in-barranquilla.html',
  'https://barranquilladating.com/barranquilla-dating-videos/tours/unmasking-private-dating-parties-in-barranquilla-colombia.html',
  'https://barranquilladating.com/barranquilla-dating-videos/tours/what-12-yrs-of-dating-colombian-girls-taught-me.html',
  'https://barranquilladating.com/barranquilla-dating-videos/tours/what-draws-foreign-men-to-dating-latinas-on-colombia-travel.html',
  'https://barranquilladating.com/barranquilla-dating-videos/tours/why-i-went-to-barranquilla-solo-travel-colombia.html',
  'https://barranquilladating.com/barranquilla-dating-videos/tours/why-should-you-start-dating-colombian-women-now.html',
  'https://barranquilladating.com/barranquilla-dating-videos/tours/your-1-problem-dating-colombian-women.html',
  'https://barranquilladating.com/culture/barranquilla-colombia-family-culture.html',
  'https://barranquilladating.com/culture/carnaval-de-barranquilla-celebration-of-colombian-culture.html',
  'https://barranquilladating.com/culture/colombian-foods-to-eat.html',
  'https://barranquilladating.com/culture/index.html',
  'https://barranquilladating.com/culture/new-years-eve-with-colombian-women.html',
  'https://barranquilladating.com/dating/6-mistakes-to-avoid-dating-a-barranquilla-woman-online.html',
  'https://barranquilladating.com/dating/avoiding-failure-dating-colombian-women.html',
  'https://barranquilladating.com/dating/colombian-women-why-you-shouldnt-play-the-bad-guy.html',
  'https://barranquilladating.com/dating/cultural-differences-to-expect-dating-colombian-women.html',
  'https://barranquilladating.com/dating/dating-a-latina-how-to-have-a-successful-first-date.html',
  'https://barranquilladating.com/dating/dating-a-latina-how-to-make-ldr-work.html',
  'https://barranquilladating.com/dating/dating-advice-compatibility-signs.html',
  'https://barranquilladating.com/dating/dating-advice-for-new-couples.html',
  'https://barranquilladating.com/dating/dating-advice-how-to-impress-a-latina.html',
  'https://barranquilladating.com/dating/dating-latina-who-adheres-to-colombian-culture.html',
  'https://barranquilladating.com/dating/how-self-responsibility-attracts-women-3-steps.html',
  'https://barranquilladating.com/dating/how-to-celebrate-valentines-day-the-colombian-way.html',
  'https://barranquilladating.com/dating/how-to-find-love-again.html',
  'https://barranquilladating.com/dating/how-to-interact-with-colombian-women-online.html',
  'https://barranquilladating.com/dating/how-to-make-a-good-impression-on-colombian-women.html',
  'https://barranquilladating.com/dating/how-to-meet-women-in-barranquilla.html',
  'https://barranquilladating.com/dating/how-to-successfully-date-a-colombian-woman-on-national-lovers-day.html',
  'https://barranquilladating.com/dating/index.html',
  'https://barranquilladating.com/dating/interesting-conversation-with-colombian-women.html',
  'https://barranquilladating.com/dating/latina-women-5-ways-of-subtly-impressing-them.html',
  'https://barranquilladating.com/dating/long-distance-relationships-with-colombian-women.html',
  'https://barranquilladating.com/dating/love-advice-best-ways-to-say-sorry.html',
  'https://barranquilladating.com/dating/making-christmas-romantic-with-colombian-woman.html',
  'https://barranquilladating.com/dating/stages-of-courtship-in-Colombia.html',
  'https://barranquilladating.com/dating/types-of-men-colombian-women-approach.html',
  'https://barranquilladating.com/dating/useful-tips-on-dating-a-colombian-woman.html',
  'https://barranquilladating.com/dating/what-to-expect-when-dating-a-latina.html',
  'https://barranquilladating.com/dating/will-colombian-women-tolerate-codependency.html',
  'https://barranquilladating.com/psychology/how-marrying-colombian-women-affects-foreign-men.html',
  'https://barranquilladating.com/psychology/index.html',
  'https://barranquilladating.com/psychology/make-anxiety-vanish-with-colombian-women.html',
  'https://barranquilladating.com/psychology/qualities-of-colombian-women-from-barranquilla.html',
  'https://barranquilladating.com/travel/best-places-to-meet-women-in-barranquilla.html',
  'https://barranquilladating.com/travel/exploring-barranquilla-colombia.html',
  'https://barranquilladating.com/travel/index.html',
  'https://barranquilladating.com/travel/memorable-moments-dating-in-barranquilla.html',
  'https://barranquilladating.com/travel/reasons-to-visit-barranquilla-colombia.html',
  'https://barranquilladating.com/travel/things-to-do-in-colombia-activities.html',
  'https://barranquilladating.com/travel/travel-advice-barranquilla-carnival.html',
  'https://barranquilladating.com/blog/index.html',
  'https://barranquilladating.com/execu/cost.html',
  'https://barranquilladating.com/execu/meet-our-matchmakers.html',
  'https://barranquilladating.com/execu/professional-matchmaker-plan.html',
  'https://barranquilladating.com/execu/the-process.html',
  'https://barranquilladating.com/execu/why-us.html',
  'https://barranquilladating.com/featured-ladies/barranquilla-colombian-women-dating-marriage-foreigners.html',
  'https://barranquilladating.com/featured-ladies/dating-colombian-women-barranquilla-meet-latinas-marriage.html',
];

// Remove duplicates
const uniqueURLs = [...new Set(URLS)];

// Statistics
let totalURLs = uniqueURLs.length;
let completed = 0;
let successful = 0;
let failed = 0;
const errors = [];

/**
 * Run test for a single URL
 */
function runTestForUrl(url, index) {
  return new Promise((resolve) => {
    const testStartTime = Date.now();
    console.log(`\n${'='.repeat(80)}`);
    console.log(`[${index + 1}/${totalURLs}] Testing: ${url}`);
    console.log(`Started at: ${new Date().toLocaleString()}`);
    console.log(`${'='.repeat(80)}\n`);

    // Run Playwright directly with CI mode to prevent HTML server from starting
    // CI mode disables interactive features like serving reports
    const testProcess = spawn('npx', [
      'playwright', 
      'test', 
      'tests/url-audit.spec.ts',
    ], {
      env: {
        ...process.env,
        URL_AUDIT_URL: url,
        // Set CI=true to disable interactive features (like serving HTML reports)
        CI: 'true',
        // Set BATCH_MODE=true to disable retries and verbose logging for faster execution
        BATCH_MODE: 'true',
        // Also set these to ensure no interactive behavior
        PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1',
      },
      stdio: 'inherit',
      shell: true,
      cwd: __dirname,
    });
    
    // Set a timeout to kill the process if it hangs (e.g., if HTML server starts)
    const timeout = setTimeout(() => {
      if (!testProcess.killed) {
        console.log(`\n⚠️  Test process timed out after 5 minutes, killing process...`);
        testProcess.kill('SIGTERM');
        setTimeout(() => {
          if (!testProcess.killed) {
            testProcess.kill('SIGKILL');
          }
        }, 5000);
      }
    }, 5 * 60 * 1000); // 5 minute timeout

    testProcess.on('close', (code) => {
      clearTimeout(timeout); // Clear timeout since process completed
      
      completed++;
      const testDuration = ((Date.now() - testStartTime) / 1000).toFixed(2);
      
      // Run organize script after test completes (non-blocking, don't wait)
      const organizeProcess = spawn('node', ['scripts/organize-html-report.js'], {
        env: {
          ...process.env,
          URL_AUDIT_URL: url,
          TEST_URL: url,
        },
        shell: true,
        cwd: __dirname,
        stdio: 'pipe',  // Don't inherit to avoid blocking
      });
      
      // Don't wait for organize script, just let it run in background
      organizeProcess.on('close', () => {
        // Silently complete
      });
      
      if (code === 0) {
        successful++;
        console.log(`\n✅ [${index + 1}/${totalURLs}] Successfully tested: ${url} (${testDuration}s)`);
      } else {
        failed++;
        errors.push({ url, code });
        console.log(`\n❌ [${index + 1}/${totalURLs}] Failed testing: ${url} (exit code: ${code}, ${testDuration}s)`);
      }
      
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Progress: ${completed}/${totalURLs} completed | ${successful} passed | ${failed} failed`);
      console.log(`${'='.repeat(80)}\n`);
      
      resolve(code);
    });

    testProcess.on('error', (error) => {
      completed++;
      failed++;
      errors.push({ url, error: error.message });
      console.error(`\n❌ [${index + 1}/${totalURLs}] Error running test for: ${url}`);
      console.error(`   Error: ${error.message}`);
      resolve(1);
    });
  });
}

/**
 * Run all tests sequentially
 */
async function runAllTests() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`BATCH URL TEST RUNNER`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Total URLs to test: ${totalURLs}`);
  console.log(`Starting at: ${new Date().toLocaleString()}`);
  console.log(`${'='.repeat(80)}\n`);

  const startTime = Date.now();

  // Run tests sequentially (one at a time)
  for (let i = 0; i < uniqueURLs.length; i++) {
    await runTestForUrl(uniqueURLs[i], i);
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Print summary
  console.log(`\n${'='.repeat(80)}`);
  console.log(`BATCH TEST SUMMARY`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Total URLs: ${totalURLs}`);
  console.log(`Completed: ${completed}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`Duration: ${duration} seconds`);
  console.log(`Started: ${new Date(startTime).toLocaleString()}`);
  console.log(`Finished: ${new Date(endTime).toLocaleString()}`);
  console.log(`${'='.repeat(80)}\n`);

  if (errors.length > 0) {
    console.log(`\n❌ FAILED URLS (${errors.length}):\n`);
    errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error.url}`);
      if (error.code !== undefined) {
        console.log(`     Exit code: ${error.code}`);
      }
      if (error.error) {
        console.log(`     Error: ${error.error}`);
      }
    });
    console.log('');
  }

  // Exit with error code if any tests failed
  process.exit(failed > 0 ? 1 : 0);
}

// Handle script interruption
process.on('SIGINT', () => {
  console.log(`\n\n⚠️  Batch test interrupted by user`);
  console.log(`   Completed: ${completed}/${totalURLs}`);
  console.log(`   Successful: ${successful}`);
  console.log(`   Failed: ${failed}\n`);
  process.exit(1);
});

// Run the batch tests
if (uniqueURLs.length === 0) {
  console.error('❌ No URLs to test. Please add URLs to the URLS array in run-batch-url-tests.js');
  process.exit(1);
}

runAllTests().catch((error) => {
  console.error('\n❌ Fatal error running batch tests:');
  console.error(error);
  process.exit(1);
});
