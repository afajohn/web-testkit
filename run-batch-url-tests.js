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

const { spawn } = require("child_process");
const path = require("path");

// Array of URLs to test
const URLS = [
  "https://bangkok-women.com/",
  "https://bangkok-women.com/about-bangkok-women.html",
  "https://bangkok-women.com/about-bangkok.html",
  "https://bangkok-women.com/about-thailand.html",
  "https://bangkok-women.com/bangkok-singles.html",
  "https://bangkok-women.com/bangkok-women-in-love.html",
  "https://bangkok-women.com/best-thai-matchmakers.html",
  "https://bangkok-women.com/culture-in-bangkok.html",
  "https://bangkok-women.com/date-bangkok-women.html",
  "https://bangkok-women.com/error-404.html",
  "https://bangkok-women.com/healthy-connections-not-parasocial-relationships.html",
  "https://bangkok-women.com/history-of-bangkok.html",
  "https://bangkok-women.com/how-to-meet-women-in-bangkok.html",
  "https://bangkok-women.com/marry-younger-bangkok-women.html",
  "https://bangkok-women.com/new-bangkok-women.html",
  "https://bangkok-women.com/new-single-girls-for-marriage-worldwide.html",
  "https://bangkok-women.com/newest-asian-women.html",
  "https://bangkok-women.com/ronna-lou-live.html",
  "https://bangkok-women.com/search-single-foreign-women-worldwide.html",
  "https://bangkok-women.com/sign-up.html",
  "https://bangkok-women.com/single-bangkok-girls.html",
  "https://bangkok-women.com/thai-brides.html",
  "https://bangkok-women.com/thai-dating-culture.html",
  "https://bangkok-women.com/thai-marriage-culture.html",
  "https://bangkok-women.com/tourism-in-bangkok.html",
  "https://bangkok-women.com/women-in-bangkok.html",
  "https://bangkok-women.com/women-in-thailand.html",
  "https://bangkok-women.com/bangkok-women-tour-photo/",
  "https://bangkok-women.com/culture/cultural-considerations-when-dating-thai-women.html",
  "https://bangkok-women.com/culture/celebrating-songkran-thai-new-year.html",
  "https://bangkok-women.com/culture/5-spiciest-thai-foods.html",
  "https://bangkok-women.com/culture/bangkok-jokes.html",
  "https://bangkok-women.com/culture/korea-town-in-bangkok.html",
  "https://bangkok-women.com/culture/cost-of-living-bangkok.html",
  "https://bangkok-women.com/culture/bangkok-street-food.html",
  "https://bangkok-women.com/culture/bangkok-flag-colors-and-patterns.html",
  "https://bangkok-women.com/culture/know-about-traditional-thai-wedding.html",
  "https://bangkok-women.com/culture/religion-thailand.html",
  "https://bangkok-women.com/culture/muay-thai-kickboxing.html",
  "https://bangkok-women.com/culture/must-try-thai-drinks-next-thailand-visit.html",
  "https://bangkok-women.com/culture/trying-thai-snacks.html",
  "https://bangkok-women.com/culture/speak-english-thailand.html",
  "https://bangkok-women.com/culture/experience-nightlife-thailand.html",
  "https://bangkok-women.com/culture/understanding-thai-language.html",
  "https://bangkok-women.com/culture/thai-elephant-national-elephant.html",
  "https://bangkok-women.com/culture/thailand-laws-punishments.html",
  "https://bangkok-women.com/culture/thai-festivals-you-shouldnt-miss.html",
  "https://bangkok-women.com/culture/thai-traditional-dance.html",
  "https://bangkok-women.com/culture/",
  "https://bangkok-women.com/blog/",
  "https://bangkok-women.com/dating/Your-Guide-to-Dating-a-Thai-Woman.html",
  "https://bangkok-women.com/dating/women-seeking-men-bangkok.html",
  "https://bangkok-women.com/dating/The-Misconceptions-About-Dating-a-Thai-Woman.html",
  "https://bangkok-women.com/dating/thai-phrases-to-know-while-dating-in-bangkok.html",
  "https://bangkok-women.com/dating/signs-of-a-catfish-dating-in-thailand.html",
  "https://bangkok-women.com/dating/reasons-why-you-should-celebrate-couple-appreciation-month.html",
  "https://bangkok-women.com/dating/questions-to-avoid-when-dating-a-thai-woman.html",
  "https://bangkok-women.com/dating/perks-of-dating-thai-women.html",
  "https://bangkok-women.com/dating/perceived-obstacles-to-dating-thai-women.html",
  "https://bangkok-women.com/dating/navigating-cultural-differences-dating-thai-women.html",
  "https://bangkok-women.com/dating/make-your-relationship-with-a-thai-woman-last.html",
  "https://bangkok-women.com/dating/interracial-dating-ways-to-impress-a-thai-woman.html",
  "https://bangkok-women.com/dating/how-to-woo-thai-women-on-valentines-day.html",
  "https://bangkok-women.com/dating/how-to-make-thai-women-feel-special.html",
  "https://bangkok-women.com/dating/how-to-impress-thai-women.html",
  "https://bangkok-women.com/dating/how-to-court-a-thai-woman.html",
  "https://bangkok-women.com/dating/gifts-that-thai-women-love-to-receive.html",
  "https://bangkok-women.com/dating/dos-and-donts-of-dating-a-thai-woman.html",
  "https://bangkok-women.com/dating/dating-thai-women-topics-to-avoid.html",
  "https://bangkok-women.com/dating/dating-thai-women-exciting-topics-on-first-dates.html",
  "https://bangkok-women.com/dating/dating-profiles-for-thai-women.html",
  "https://bangkok-women.com/dating/avoid-this-when-dating-women-in-bangkok.html",
  "https://bangkok-women.com/dating/how-long-should-you-know-someone-before-dating.html",
  "https://bangkok-women.com/dating/how-to-know-if-someone-is-worth-dating.html",
  "https://bangkok-women.com/dating/worst-date-ideas.html",
  "https://bangkok-women.com/dating/dating-tips-for-shy-guys.html",
  "https://bangkok-women.com/dating/how-can-impress-bangkok-woman.html",
  "https://bangkok-women.com/dating/how-to-find-girlfriend-in-bangkok.html",
  "https://bangkok-women.com/dating/make-good-impression-on-first-date.html",
  "https://bangkok-women.com/dating/how-to-approach-women-in-public.html",
  "https://bangkok-women.com/dating/create-ultimate-online-dating-profile.html",
  "https://bangkok-women.com/dating/text-etiquette-dating-women.html",
  "https://bangkok-women.com/dating/bangkok-women-reasons-theyre-worth-dating.html",
  "https://bangkok-women.com/dating/how-long-should-you-talk-to-someone-before-dating.html",
  "https://bangkok-women.com/dating/how-to-impress-a-bangkok-woman-on-a-first-date.html",
  "https://bangkok-women.com/dating/online-dating-etiquette.html",
  "https://bangkok-women.com/dating/start-conversation-online.html",
  "https://bangkok-women.com/dating/impress-thai-parents.html",
  "https://bangkok-women.com/dating/guide-dating-in-thailand-for-expats.html",
  "https://bangkok-women.com/dating/approach-woman-thailand.html",
  "https://bangkok-women.com/dating/single-asian-women-falling-western-men.html",
  "https://bangkok-women.com/dating/effective-dating-advice-men-need-often.html",
  "https://bangkok-women.com/dating/meeting-someone-new-tips-engaging-conversations.html",
  "https://bangkok-women.com/dating/flirting-vs-sexual-harassment-charm-women.html",
  "https://bangkok-women.com/dating/throw-hardball-dating-mind-games.html",
  "https://bangkok-women.com/dating/dating-introvert-women-interested.html",
  "https://bangkok-women.com/dating/dating-tips-shy-guy-shyness-confidence.html",
  "https://bangkok-women.com/dating/deep-love-messages-for-her-letters.html",
  "https://bangkok-women.com/dating/protective-boyfriend-independent-woman.html",
  "https://bangkok-women.com/dating/love-illusion-strive-perfection.html",
  "https://bangkok-women.com/dating/never-settle-less-mean-relationship.html",
  "https://bangkok-women.com/dating/online-conversation-starters.html",
  "https://bangkok-women.com/dating/be-great-boyfriend-thai-woman.html",
  "https://bangkok-women.com/dating/bridging-gap-activities-long-distance-relationships.html",
  "https://bangkok-women.com/dating/case-clingy-girlfriend-red-flag.html",
  "https://bangkok-women.com/dating/contra-dating-improve-chances.html",
  "https://bangkok-women.com/dating/penny-dating-toxic-heres-can-learn.html",
  "https://bangkok-women.com/dating/questions-long-distance-relationships.html",
  "https://bangkok-women.com/dating/rebound-relationship-never-good-idea.html",
  "https://bangkok-women.com/dating/thai-women-really-like.html",
  "https://bangkok-women.com/dating/western-mans-guide-dating-phuket-women.html",
  "https://bangkok-women.com/dating/what-looking-for-relationship-key-factors.html",
  "https://bangkok-women.com/dating/what-to-do-first-date-ideas.html",
  "https://bangkok-women.com/dating/when-right-time-say-love.html",
  "https://bangkok-women.com/dating/women-thailand-dominating-fields.html",
  "https://bangkok-women.com/dating/do-looks-matter-women-attracts.html",
  "https://bangkok-women.com/dating/entering-committed-relationship-ask-questions-first.html",
  "https://bangkok-women.com/dating/fun-group-date-ideas.html",
  "https://bangkok-women.com/dating/good-men-reasons-cant-find-one.html",
  "https://bangkok-women.com/dating/how-to-find-love-online-tips.html",
  "https://bangkok-women.com/dating/manage-first-date-jitters-anxiety.html",
  "https://bangkok-women.com/dating/interracial-dating-worth-despite-cons.html",
  "https://bangkok-women.com/dating/more-than-friend-less-lover.html",
  "https://bangkok-women.com/dating/cultural-experiences-expect-dating-asian-women.html",
  "https://bangkok-women.com/dating/second-date-tips.html",
  "https://bangkok-women.com/dating/men-take-note-attracts-women-online.html",
  "https://bangkok-women.com/dating/low-pressure-first-date-coffee-date.html",
  "https://bangkok-women.com/dating/alphabet-dating-a-ideas-spice-relationship.html",
  "https://bangkok-women.com/dating/",
  "https://bangkok-women.com/psychology/why-thai-brides-are-ideal-wives.html",
  "https://bangkok-women.com/psychology/why-asian-women-prefer-large-dating-age-gaps.html",
  "https://bangkok-women.com/psychology/the-benefits-of-dating-thai-woman-on-national-lovers-day.html",
  "https://bangkok-women.com/psychology/thai-women-unique-from-the-rest.html",
  "https://bangkok-women.com/psychology/endearing-qualities-of-thai-women.html",
  "https://bangkok-women.com/psychology/behavior-thai-women-hate.html",
  "https://bangkok-women.com/psychology/bangkok-women-for-marriage-dating.html",
  "https://bangkok-women.com/psychology/ten-questions-girls-are-afraid-to-ask.html",
  "https://bangkok-women.com/psychology/lack-of-chemistry.html",
  "https://bangkok-women.com/psychology/mental-health-relationships.html",
  "https://bangkok-women.com/psychology/how-to-make-someone-think-of-you.html",
  "https://bangkok-women.com/psychology/signs-ready-marriage.html",
  "https://bangkok-women.com/psychology/what-women-want-man.html",
  "https://bangkok-women.com/psychology/emotional-intelligence-and-relationships.html",
  "https://bangkok-women.com/psychology/how-to-control-anger-relationship-resolve.html",
  "https://bangkok-women.com/psychology/practice-self-love-healthier-relationship.html",
  "https://bangkok-women.com/psychology/how-mature-relationship-make-love-last.html",
  "https://bangkok-women.com/psychology/how-to-apologize-girlfriend-argument.html",
  "https://bangkok-women.com/psychology/signs-youre-falling-love-someone-online.html",
  "https://bangkok-women.com/psychology/when-break-up-relationship.html",
  "https://bangkok-women.com/psychology/build-emotional-intimacy-practices-couples.html",
  "https://bangkok-women.com/psychology/how-to-vulnerable-relationship-men-know.html",
  "https://bangkok-women.com/psychology/intimate-relationships-cannot-exist-without-factors.html",
  "https://bangkok-women.com/psychology/new-relationship-anxiety-normal-isnt.html",
  "https://bangkok-women.com/psychology/orange-peel-theory-doesnt-work.html",
  "https://bangkok-women.com/psychology/rebound-relationship-never-good-idea.html",
  "https://bangkok-women.com/psychology/settle-conditional-love-deserve-more.html",
  "https://bangkok-women.com/psychology/support-partner-difficult-times.html",
  "https://bangkok-women.com/psychology/women-always-right.html",
  "https://bangkok-women.com/psychology/your-most-ambivalent-relationships-toxic.html",
  "https://bangkok-women.com/psychology/nurturing-honesty-relationship-practices-couples.html",
  "https://bangkok-women.com/psychology/dealing-rejection-not-lose-hope-love.html",
  "https://bangkok-women.com/psychology/",
  "https://bangkok-women.com/realities/relationship-advice-preserve-a-happy-marriage.html",
  "https://bangkok-women.com/realities/reasons-to-have-a-christmas-wedding.html",
  "https://bangkok-women.com/realities/meet-bangkok-women-through-romance-tours.html",
  "https://bangkok-women.com/realities/single-journey-thailands-matchmaking-initiative.html",
  "https://bangkok-women.com/realities/realities-long-distance-relationship.html",
  "https://bangkok-women.com/realities/will-i-ever-find-love-again.html",
  "https://bangkok-women.com/realities/identifying-gold-digger.html",
  "https://bangkok-women.com/realities/giving-up-on-love.html",
  "https://bangkok-women.com/realities/cheating-in-a-relationship.html",
  "https://bangkok-women.com/realities/pros-cons-marry-thai-woman.html",
  "https://bangkok-women.com/realities/what-is-emotional-infidelity-overcome.html",
  "https://bangkok-women.com/realities/dating-single-parent-lessons-finding-love.html",
  "https://bangkok-women.com/realities/ai-love-perks-pitfalls-digital-girlfriend.html",
  "https://bangkok-women.com/realities/dating-in-30s-terrible-terrific.html",
  "https://bangkok-women.com/realities/how-to-deal-loneliness-far-away.html",
  "https://bangkok-women.com/realities/know-harsh-facts-long-distance-relationships.html",
  "https://bangkok-women.com/realities/ldr-meeting-first-time.html",
  "https://bangkok-women.com/realities/long-distance-relationship-problems.html",
  "https://bangkok-women.com/realities/move-thailand.html",
  "https://bangkok-women.com/realities/overcome-interracial-couple-problems.html",
  "https://bangkok-women.com/realities/rebuild-trust-relationship-affair.html",
  "https://bangkok-women.com/realities/getting-back-together-ex-good-idea.html",
  "https://bangkok-women.com/realities/getting-ready-for-marriage-saying.html",
  "https://bangkok-women.com/realities/growing-apart-partner-rekindle-spark.html",
  "https://bangkok-women.com/realities/healing-cheating-way-recovery.html",
  "https://bangkok-women.com/realities/how-to-break-up-ending-relationship.html",
  "https://bangkok-women.com/realities/stick-monogamous-relationship.html",
  "https://bangkok-women.com/realities/consider-dating-single-mother.html",
  "https://bangkok-women.com/realities/finding-balance-work-relationship.html",
  "https://bangkok-women.com/realities/",
  "https://bangkok-women.com/travel/The-Rich-and-Diverse-Wildlife-of-Thailand.html",
  "https://bangkok-women.com/travel/spending-christmas-in-bangkok-thailand.html",
  "https://bangkok-women.com/travel/restaurants-thai-women-love.html",
  "https://bangkok-women.com/travel/reasons-to-visit-bangkok-thailand.html",
  "https://bangkok-women.com/travel/must-know-facts-before-moving-to-thailand.html",
  "https://bangkok-women.com/travel/little-known-facts-about-bangkok-thailand.html",
  "https://bangkok-women.com/travel/land-of-smiles-thailand-nickname.html",
  "https://bangkok-women.com/travel/getting-to-know-the-culture-of-thailand.html",
  "https://bangkok-women.com/travel/essential-travel-hacks-while-touring-bangkok.html",
  "https://bangkok-women.com/travel/Beating-the-Bangkok-Thailand-Heat.html",
  "https://bangkok-women.com/travel/bangkok-thailand-dating-locations.html",
  "https://bangkok-women.com/travel/bangkok-thailand-best-things-to-do.html",
  "https://bangkok-women.com/travel/5-Ways-to-Make-the-Most-Out-of-Bangkok-Thailand.html",
  "https://bangkok-women.com/travel/5-Romantic-Dinner-Date-Destinations-in-Bangkok-Thailand.html",
  "https://bangkok-women.com/travel/4-of-the-Most-Romantic-Parks-in-Bangkok-Thailand.html",
  "https://bangkok-women.com/travel/best-dating-spots-bangkok-2023.html",
  "https://bangkok-women.com/travel/weather-november-bangkok.html",
  "https://bangkok-women.com/travel/transportation-thailand.html",
  "https://bangkok-women.com/travel/thailand-travel-tips-older-men.html",
  "https://bangkok-women.com/travel/thailand-historical-sites.html",
  "https://bangkok-women.com/travel/hotels-bangkok.html",
  "https://bangkok-women.com/travel/what-to-wear-thailand.html",
  "https://bangkok-women.com/travel/national-parks-thailand.html",
  "https://bangkok-women.com/travel/thai-phrases-dating.html",
  "https://bangkok-women.com/travel/thai-visa-guide.html",
  "https://bangkok-women.com/travel/thai-airlines-guide.html",
  "https://bangkok-women.com/travel/planning-trip-to-thailand.html",
  "https://bangkok-women.com/travel/best-thailand-beaches.html",
  "https://bangkok-women.com/travel/must-try-thai-drinks-bangkok-heat.html",
  "https://bangkok-women.com/travel/best-places-propose-thailand.html",
  "https://bangkok-women.com/travel/navigating-cultural-differences-dating-thai-women.html",
  "https://bangkok-women.com/travel/Things-to-do-When-the-Sun-Goes-Down.html",
  "https://bangkok-women.com/travel/where-stay-bangkok-best-neighborhoods-offer.html",
  "https://bangkok-women.com/travel/long-can-us-citizen-stay-thailand.html",
  "https://bangkok-women.com/travel/",
  "https://bangkok-women.com/bangkok-women-videos/tours/find-a-thai-girlfriend-instantly.html",
  "https://bangkok-women.com/bangkok-women-videos/tours/dating-thai-women-bangkok-thailand-solo-trip.html",
  "https://bangkok-women.com/bangkok-women-videos/tours/thai-women-attend-bangkok-dating-event-for-foreign-men.html",
  "https://bangkok-women.com/bangkok-women-videos/tours/building-modern-romance-with-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/tours/thai-women-seek-foreign-men-in-bangkok.html",
  "https://bangkok-women.com/bangkok-women-videos/tours/meet-hundreds-of-bangkok-women-at-exclusive-thai-dating-club.html",
  "https://bangkok-women.com/bangkok-women-videos/tours/exclusive-thai-dating-scene-changes-foreign-men.html",
  "https://bangkok-women.com/bangkok-women-videos/tours/bangkok-thailand-singles-vacation-meeting-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/tours/passport-bro-finds-soulmate-in-bangkok-thai-girls-reaction.html",
  "https://bangkok-women.com/bangkok-women-videos/tours/i-dated-200-thai-women-in-bangkok-thailand-travel-dating.html",
  "https://bangkok-women.com/bangkok-women-videos/tours/dating-300-thai-women-in-bangkok-wmaf-couples-interview.html",
  "https://bangkok-women.com/bangkok-women-videos/tours/1st-time-outside-usa-finding-a-thai-girlfriend-in-bangkok.html",
  "https://bangkok-women.com/bangkok-women-videos/tours/dating-a-different-thai-girl-every-day-bangkok-matchmaking.html",
  "https://bangkok-women.com/bangkok-women-videos/tours/moving-to-bangkok-for-thai-women-is-it-worth-it.html",
  "https://bangkok-women.com/bangkok-women-videos/tours/american-men-dominate-thai-speed-dating.html",
  "https://bangkok-women.com/bangkok-women-videos/tours/asian-women-discover-the-beauty-of-thailand.html",
  "https://bangkok-women.com/bangkok-women-videos/",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/private-speed-dating-with-thai-women-in-bangkok-nightlife.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/building-modern-romance-with-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/thai-women-attend-bangkok-dating-event-for-foreign-men.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/thai-women-pack-dating-event-to-meet-their-husbands.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/love-with-no-boundaries-thai-women-dating.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/finding-serious-thai-girls-in-bangkok.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/exciting-adventures-dating-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/unforgettable-moments-dating-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/thailand-solo-travel-are-bangkok-women-worth-dating.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/dating-dozens-of-thai-women-your-first-days-in-bangkok.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/my-first-time-dating-women-in-bangkok.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/he-found-his-thai-wife-on-his-2nd-singles-night.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/how-to-get-a-thai-girlfriend-international-dating-tips.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/kiwi-tourist-finds-thai-wife-in-his-first-time-in-thailand.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/how-to-impress-thai-girls-bangkok-solo-travel-tips.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/bangkok-girls-want-to-be-a-tradwife-thai-women-exposed.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/bangkok-is-like-miami-passport-bros-dating-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/dump-western-women-for-thai-girls-passport-bros-in-bangkok.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/american-man-blown-away-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/overcoming-bangkok-dating-fears-how-to-find-a-thai-wife.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/can-foreigners-date-sincere-thai-girls-in-bangkok.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/midwest-man-dominates-bangkok-dating-scene.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/men-are-flocking-to-bangkok-for-these-reaons.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/foreign-guys-ditch-the-west-to-date-asian-women-in-thailand.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/man-has-more-in-common-with-thai-women-than-americans.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/first-and-last-sincere-asian-girl-finds-love-with-foreigner.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/american-men-are-crushing-bangkoks-dating-scene.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/are-thai-women-really-attracted-to-foreigners.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/americans-overwhelmed-by-thai-girls.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/",
  "https://bangkok-women.com/bangkok-women-videos/informational/why-do-independent-thai-women-attend-our-socials.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/the-beautiful-women-of-bangkok-thailand.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/the-endearing-qualities-of-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/how-do-singles-vacation-work.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/things-to-remember-when-it-comes-to-online-dating.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/stunning-thailand-brides.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/travel-guide-fun-things-to-do-in-bangkok-thailand.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/bangkok-from-land-of-smiles-to-land-of-soulmates.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/how-to-date-thai-women-in-thailand-with-less-hassle.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/what-thai-girls-want-in-marriage-interracial-marriages.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/my-solo-tour-in-bangkok.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/thai-women-want-foreign-men-as-life-partner.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/what-thai-women-want-for-valentines.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/breaking-your-paradigm-bangkok-women.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/bangkok-women-how-do-i-meet-the-right-woman.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/international-dating-are-thai-women-into-me.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/bangkok-unsafe-for-foreign-men-to-date.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/approaching-thai-women-as-an-older-man-dating-bangkok-women.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/places-to-go-on-a-date-dating-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/reaching-out-to-thai-women-after-the-socials-thai-dating.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/how-to-step-out-of-a-date-politely-thai-dating.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/do-thai-women-send-photos-in-letters-thai-dating.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/bangkok-tours-individual-vs-group.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/thai-women-seek-foreign-men.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/dating-young-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/meeting-thai-women-f2f.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/bangkok-women-dating-hurdles.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/why-bangkok-women-arent-disingenuous.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/why-bangkok-women-are-worth-it.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/thai-women-how-soon-do-couples-get-engaged.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/how-thai-dating-works.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/dating-in-thailand-date-stunning-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/contacting-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/experience-bangkok-thailand-2022-thai-travel-guide.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/challenges-dating-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/thai-dating-the-best-qualities-dating-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/traveling-to-meet-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/are-thai-women-deceitful.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/exposing-lies-about-dating-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/thai-women-never-resist-dating-these-men.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/are-visas-needed-for-marrying-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/how-to-talk-to-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/rapid-bangkok-dating-100-thai-women-in-8-hrs.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/keepthai-women-interested-after-marriage.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/honest-thai-women-pursue-foreigners-in-bangkok.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/dating-the-right-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/stunning-single-thai-women-want-foreigners.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/ideal-matches-of-thai-women-dating-in-bangkok.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/are-thai-girls-in-bangkok-professional-daters.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/do-thai-girls-have-a-problem-with-age-gap-bangkok-dating.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/dont-fall-for-the-wrong-thai-girl-bangkok-dating-advice.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/thai-matchmaker-helps-thailand-tourists-find-love.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/i-still-live-with-mom-what-will-thai-girls-think.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/1-weakness-of-international-marriage-thailand-dating-vlog.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/do-thai-girls-fall-in-love-with-guys-on-online-dating-apps.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/will-this-obvious-romance-scam-fool-you-dating-thai-girls.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/dont-settle-for-less-than-a-thai-girlfriend.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/40s-thai-women-seek-foreign-men-in-bangkok.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/4-exciting-gifts-thai-women-cant-turn-down.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/indecisive-foreigner-couldve-married-thai-wife-5-years-ago.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/is-24-yrs-age-gap-too-big-for-thai-girls.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/28-to-43-yr-old-thai-women-actively-seeking-love.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/should-i-marry-my-thai-girlfriend-in-bangkok-matchmaker-qa.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/too-expensive-to-meet-thai-women-speed-dating-in-bangkok.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/age-knows-no-boundaries-in-dating-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/moving-to-bangkok-for-thai-women-is-it-worth-it.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/hat-old-reality-in-dating-thai-girls-in-bangkok.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/passport-bro-should-consider-this-in-dating-thai-girls.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/thai-women-in-their-30s-wants-mature-foreigners.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/date-thai-girls-safely-without-any-apps.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/one-flight-away-find-your-thai-girlfriend-in-bangkok.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/aggressive-thai-girls-compete-for-your-attention.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/dating-thai-girls-safely-at-private-bangkok-event.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/why-foreign-guys-cant-resist-bangkok.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/no-faith-in-dating-apps-38yo-thai-girl-hires-matchmaker.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/why-serious-thai-girls-avoid-dating-apps.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/how-guys-end-up-dating-in-thailand.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/date-100-thai-girls-in-1-night.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/are-thai-girls-scared-to-date-you.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/dont-get-fooled-dating-thai-girls-requires-realism.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/asian-women-candid-confession-to-find-foreign-love.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/huge-risk-men-take-on-thai-dating-apps.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/single-thai-women-over-40-ready-for-love-2025-new-profiles.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/thai-girls-delete-dating-apps-for-international-matchmaking.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/thai-girls-first-time-dating-foreigners.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/easiest-way-to-find-honest-thai-girls.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/top-mistakes-foreign-men-make-on-thai-dates.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/every-thai-girl-wants-this-from-foreigners.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/stop-gambling-on-love-date-serious-asian-women.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/dont-unravel-before-you-travel-thai-dating-mindset.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/dating-over-50-bangkok-women-redefine-love.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/thai-dating-secrets-foreigners-must-know.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/american-men-cant-stay-single-in-bangkok.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/marriage-or-motive-thai-girls-dating-foreigners-get-real.html",
  "https://bangkok-women.com/execu/cost.html",
  "https://bangkok-women.com/execu/meet-our-matchmakers.html",
  "https://bangkok-women.com/execu/professional-matchmaker-plan.html",
  "https://bangkok-women.com/execu/the-process.html",
  "https://bangkok-women.com/execu/why-us.html",
  "https://bangkok-women.com/featured-ladies/BW-YT003Profiles.html",
  "https://bangkok-women.com/featured-ladies/BW-YT126.html",
  "https://bangkok-women.com/featured-ladies/BW-YTProfiles05.html",
  "https://bangkok-women.com/featured-ladies/BW-YTProfiles06.html",
  "https://bangkok-women.com/featured-ladies/BW-YTProfiles07.html",
  "https://bangkok-women.com/women-tour/",
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
    console.log(`\n${"=".repeat(80)}`);
    console.log(`[${index + 1}/${totalURLs}] Testing: ${url}`);
    console.log(`Started at: ${new Date().toLocaleString()}`);
    console.log(`${"=".repeat(80)}\n`);

    // Run Playwright directly with CI mode to prevent HTML server from starting
    // CI mode disables interactive features like serving reports
    const testProcess = spawn(
      "npx",
      ["playwright", "test", "tests/url-audit.spec.ts"],
      {
        env: {
          ...process.env,
          URL_AUDIT_URL: url,
          // Set CI=true to disable interactive features (like serving HTML reports)
          CI: "true",
          // Also set these to ensure no interactive behavior
          PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1",
        },
        stdio: "inherit",
        shell: true,
        cwd: __dirname,
      },
    );

    // Set a timeout to kill the process if it hangs (e.g., if HTML server starts)
    const timeout = setTimeout(
      () => {
        if (!testProcess.killed) {
          console.log(
            `\n⚠️  Test process timed out after 5 minutes, killing process...`,
          );
          testProcess.kill("SIGTERM");
          setTimeout(() => {
            if (!testProcess.killed) {
              testProcess.kill("SIGKILL");
            }
          }, 5000);
        }
      },
      5 * 60 * 1000,
    ); // 5 minute timeout

    testProcess.on("close", (code) => {
      clearTimeout(timeout); // Clear timeout since process completed

      completed++;
      const testDuration = ((Date.now() - testStartTime) / 1000).toFixed(2);

      // Run organize script after test completes (non-blocking, don't wait)
      const organizeProcess = spawn(
        "node",
        ["scripts/organize-html-report.js"],
        {
          env: {
            ...process.env,
            URL_AUDIT_URL: url,
            TEST_URL: url,
          },
          shell: true,
          cwd: __dirname,
          stdio: "pipe", // Don't inherit to avoid blocking
        },
      );

      // Don't wait for organize script, just let it run in background
      organizeProcess.on("close", () => {
        // Silently complete
      });

      if (code === 0) {
        successful++;
        console.log(
          `\n✅ [${
            index + 1
          }/${totalURLs}] Successfully tested: ${url} (${testDuration}s)`,
        );
      } else {
        failed++;
        errors.push({ url, code });
        console.log(
          `\n❌ [${
            index + 1
          }/${totalURLs}] Failed testing: ${url} (exit code: ${code}, ${testDuration}s)`,
        );
      }

      console.log(`\n${"=".repeat(80)}`);
      console.log(
        `Progress: ${completed}/${totalURLs} completed | ${successful} passed | ${failed} failed`,
      );
      console.log(`${"=".repeat(80)}\n`);

      resolve(code);
    });

    testProcess.on("error", (error) => {
      completed++;
      failed++;
      errors.push({ url, error: error.message });
      console.error(
        `\n❌ [${index + 1}/${totalURLs}] Error running test for: ${url}`,
      );
      console.error(`   Error: ${error.message}`);
      resolve(1);
    });
  });
}

/**
 * Run all tests sequentially
 */
async function runAllTests() {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`BATCH URL TEST RUNNER`);
  console.log(`${"=".repeat(80)}`);
  console.log(`Total URLs to test: ${totalURLs}`);
  console.log(`Starting at: ${new Date().toLocaleString()}`);
  console.log(`${"=".repeat(80)}\n`);

  const startTime = Date.now();

  // Run tests sequentially (one at a time)
  for (let i = 0; i < uniqueURLs.length; i++) {
    await runTestForUrl(uniqueURLs[i], i);
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Print summary
  console.log(`\n${"=".repeat(80)}`);
  console.log(`BATCH TEST SUMMARY`);
  console.log(`${"=".repeat(80)}`);
  console.log(`Total URLs: ${totalURLs}`);
  console.log(`Completed: ${completed}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`Duration: ${duration} seconds`);
  console.log(`Started: ${new Date(startTime).toLocaleString()}`);
  console.log(`Finished: ${new Date(endTime).toLocaleString()}`);
  console.log(`${"=".repeat(80)}\n`);

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
    console.log("");
  }

  // Exit with error code if any tests failed
  process.exit(failed > 0 ? 1 : 0);
}

// Handle script interruption
process.on("SIGINT", () => {
  console.log(`\n\n⚠️  Batch test interrupted by user`);
  console.log(`   Completed: ${completed}/${totalURLs}`);
  console.log(`   Successful: ${successful}`);
  console.log(`   Failed: ${failed}\n`);
  process.exit(1);
});

// Run the batch tests
if (uniqueURLs.length === 0) {
  console.error(
    "❌ No URLs to test. Please add URLs to the URLS array in run-batch-url-tests.js",
  );
  process.exit(1);
}

runAllTests().catch((error) => {
  console.error("\n❌ Fatal error running batch tests:");
  console.error(error);
  process.exit(1);
});
