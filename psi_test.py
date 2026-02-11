import requests
import time
import urllib.parse
import os
import json
from dotenv import load_dotenv

load_dotenv()

# --- CONFIGURATION ---
API_KEY = os.getenv("PSI_API_KEY")  # Replace with your actual key
URLS = [
  "https://1stlatinwomen.com/psychology/qualities-latina-women-look-for.html",
  "https://1stlatinwomen.com/psychology/latina-women-are-loyal-lovers-and-companions.html",
  "https://1stlatinwomen.com/psychology/hero-instinct-what-latina-want-from-men.html",
  "https://1stlatinwomen.com/psychology/benefits-of-having-a-latina-wife.html",
  "https://1stlatinwomen.com/psychology/approach-anxiety-disappears-around-latinas.html",
  "https://1stlatinwomen.com/psychology/knowing-developing-romantic-emotional-connection.html",
  "https://1stlatinwomen.com/psychology/escaping-narcissistic-relationship-survival-guide.html",
  "https://1stlatinwomen.com/realities/latina-women-online-dating-pros-and-cons.html",
  "https://1stlatinwomen.com/realities/how-to-propose-to-a-Latina.html",
  "https://1stlatinwomen.com/realities/an-exciting-way-to-meet-latin-women.html",
  "https://1stlatinwomen.com/realities/infidelity-marriage-moving-forward-rebuilding-trust.html",
  "https://1stlatinwomen.com/realities/dating-single-parent-second-chance-love.html",
  "https://1stlatinwomen.com/realities/women-online-hesitant-meet-person.html",
  "https://1stlatinwomen.com/travel/5-museums-in-latin-america-worth-exploring.html",
  "https://1stlatinwomen.com/travel/ways-to-meet-costa-rican-women.html",
  "https://1stlatinwomen.com/travel/solo-travel-recommendations-for-latina-women.html",
  "https://1stlatinwomen.com/travel/places-to-visit-in-colombia-during-new-year.html",
  "https://1stlatinwomen.com/travel/latin-america-top-spectacular-destinations.html",
  "https://1stlatinwomen.com/travel/international-travel-dos-and-donts-latin-america-travel-tips.html",
  "https://1stlatinwomen.com/execu/cost.html",
  "https://1stlatinwomen.com/execu/professional-matchmaker-plan.html/#executive-anchor",
  "https://1stlatinwomen.com/execu/the-process.html/#executive-anchor",
  "https://1stlatinwomen.com/execu/why-us.html/#executive-anchor",
  "https://1stlatinwomen.com/execu/meet-our-matchmakers.html/#executive-anchor",
  "https://1stlatinwomen.com/1stlatinwomen-videos/",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/why-meet-100-stunning-latinas-in-barranquilla.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/why-foreign-women-seek-husbands-from-abroad.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/why-do-foreign-men-go-to-cartagena-colombia.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/why-date-and-marry-medellin-women.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/what-happens-and-how-it-works-1st-latin-women-socials.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/ukrainian-girls-vs-women-from-cartagena-colombia-major-differences.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/travelling-to-latin-america-exploring-its-countries.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/travel-101-how-to-prepare-for-a-memorable-trip.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/the-right-time-to-meet-her-is-now-1st-latin-women-tours.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/the-history-of-matchmaking-international-dating.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/the-face-of-international-dating-with-latina-women-discussed.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/singles-vacation-updates-by-john-adams-afa-president.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/singles-vacation-reviews-costa-rica-women.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/pursuit-of-latin-women-south-america-solo-travel.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/private-speed-dating-parties-of-medellin.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/peruvian-women-guide-foreign-men-through-lima.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/origins-of-matchmaking-in-latin-america.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/my-peru-travel-blog-dating-100s-of-peru-women-in-lima.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/meeting-100-gorgeous-latinas-in-1-night.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/medellin-latinas-swarm-foreign-dating-event.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/matched-dating-colombian-women-in-medellin.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/lima-peru-women-dating-in-latin-america.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/latinas-seek-foreign-men-at-international-dating-events.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/latinas-prefer-dating-foreign-men-peru-travel-vlog.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/latinas-exposed-americans-tell-dating-stories.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/latina-women-know-what-men-want-foreign-men-love.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/latin-women-wedding-traditions.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/latin-women-eagerly-pursue-foreign-men-in-latin-america.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/latin-dating-draws-foreign-men-to-south-america.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/latin-brides-vs-western-brides-know-their-differences.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/join-5-dating-events-with-latina-women-no-social-anxiety.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/john-adams-shares-afa-dating-success-in-colombia.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/international-dating-101-learning-the-basics.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/hot-latinas-engage-foreign-men-at-speed-dating-event.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/hot-colombian-women-prefer-dating-foreign-men.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/get-to-know-latin-women-colombian-women.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/foreign-guys-dating-latinas-dare-you-to-do-it-too.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/foreign-dating-advice-expectations-of-the-women.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/finding-good-colombian-women-foreign-men-reveal-how.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/exploring-the-city-of-kings-lima-peru-with-john-adams-part-1.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/exploring-the-city-of-kings-a-tour-to-lima-peru-part-2.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/experience-the-trip-of-a-lifetime-with-1st-latin-women.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/dozens-of-dates-with-latinas-in-barranquilla-colombia.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/do-you-meet-the-standards-of-afro-colombian-women.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/do-latinas-try-hard-to-get-a-man-interracial-love.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/dating-latinas-in-the-sensational-mexico-city.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/dating-latinas-in-cdmx-experience-youll-never-forget.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/dating-latinas-100-costa-rica-women-want-connection.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/dating-colombian-women-blew-me-away.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/craigslist-vs-1st-latin-women-why-are-we-better.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/colombian-women-only-demand-one-thing-from-foreign-men.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/colombian-women-enjoying-and-dating-foreign-men-in-clubs.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/colombia-worth-a-visit-colombian-women-welcome-you.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/american-reveals-the-truth-about-dating-latina-women-abroad.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/almost-get-scammed-foreign-men-dating-colombian-women.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/100-mexican-women-greet-foreigners-cdmx-speed-dating.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/100-latinas-in-mexico-city-swarm-foreign-men.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/tours/100-colombian-women-in-cartagena-welcome-passport-bros.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/testimonial/what-makes-costa-rican-women-irresistible-to-foreign-men.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/testimonial/dating-verified-colombian-women.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/testimonial/your-love-lives-in-cdmx-dating-latinas.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/testimonial/",
  "https://1stlatinwomen.com/1stlatinwomen-videos/testimonial/most-foreigners-focus-on-the-wrong-thing.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/testimonial/you-are-not-prepared-for-colombian-women.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/testimonial/why-few-foreigners-succeed-dating-latinas-in-mexico-city.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/testimonial/why-dating-costa-rican-women-shocked-me.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/testimonial/what-to-expect-dating-colombian-women-in-cartagena.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/testimonial/unmatched-why-dating-costa-rican-women-hits-different.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/testimonial/pursuing-latinas-in-san-jose-dating-costa-rican-women.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/testimonial/no-excuse-second-solo-trip-dating-latinas-in-medellin.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/testimonial/meet-date-beautiful-peruvian-women.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/testimonial/matched-in-lima-marrying-a-peruvian-woman.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/testimonial/matched-for-life-marrying-a-colombian-woman.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/testimonial/match-made-in-lima-dating-peruvian-women.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/testimonial/marrying-a-latina-i-met-on-a-costa-rican-dating-app.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/testimonial/leaving-colombia-engaged-dating-colombian-women.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/testimonial/latinas-prefer-interracial-relationships-with-foreign-men.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/testimonial/it-works-i-found-my-peruvian-fiance-1-week-in-lima.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/testimonial/in-love-with-lima-where-latinas-chase-foreign-men.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/testimonial/how-i-met-my-latina-girlfriend-in-colombia.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/testimonial/foreign-men-and-colombian-women-up-close-and-personal.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/testimonial/fast-paced-dating-in-barranquilla-for-you.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/testimonial/dating-stunning-colombian-women.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/testimonial/date-different-in-colombia-americans-react-to-latinas.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/testimonial/curve-your-enthusiasm-my-first-time-dating-colombianas.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/testimonial/colombian-women-rate-foreigners-during-dates.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/testimonial/colombian-women-for-marriage.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/testimonial/10-women-to-1-man-speed-dating-with-latinas-in-latin-america.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/testimonial/colombian-dating-are-latin-women-being-divas.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/10-stunning-argentina-girls-want-you.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/can-you-keep-up-with-latinas.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/what-peruvian-girls-love-about-foreigners.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/latinas-in-colombia-peru-mexico-and-costa-rica-seeking-love.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/colombian-women-only-date-serious-foreigners.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/why-latinas-date-that-way.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/are-colombian-latinas-easy-to-date.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/zero-rejections-dating-dozens-of-latinas.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/will-latina-women-talk-to-you-international-dating.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/what-motivates-costa-rican-latinas-to-date-foreigners.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/outnumbered-men-dating-dozens-of-stunning-latinas.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/im-dating-for-marriage.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/dating-ukrainian-girls-in-mexico-city.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/costa-rica-women-vs-colombianas-where-should-you-date.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/23-yr-old-latina-dates-foreigners-thru-matchmakers.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/what-latinas-bring-to-the-table-peruanas-react.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/48yr-old-latina-puts-men-under-55-on-blast.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/young-colombian-women-want-foreign-men.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/why-online-dating-is-good-for-you.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/why-millions-of-latinas-want-foreign-men.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/why-colombian-women-want-foreign-men.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/who-are-the-latina-women-you-find-on-dating-sites.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/when-is-the-best-time-to-visit-san-jose-costa-rica.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/what-stopping-foreign-men-from-dating-colombian-women.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/what-gifts-latina-women-love-holiday-gift-ideas.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/what-few-admit-about-dating-costa-rican-women.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/what-are-the-dangers-of-dating-costa-rican-women.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/serious-costa-rican-girls-wow-foreigners-in-san-jose.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/real-reason-latina-women-pursue-foreign-men.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/older-men-and-their-chances-in-dating-san-jose-costa-rica-women.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/marriage-matchmaking-and-its-current-state.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/love-a-latin-woman-1stlatinwomen-com.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/latinas-ideal-wives-for-mature-men.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/latina-women-in-lima-peru-need-more-foreign-men.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/latina-dating-differences-mexicanas-vs-colombianas.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/latin-dating-2021-colombian-women-for-marriage.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/latin-dances-in-dating-latina-women-dating-advice-for-men.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/k1-visa-approval-process-for-latin-women.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/international-dating-with-latina-women-do-it.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/im-ready-to-marry-31yo-peruvian-woman-wants-to-meet-you.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/how-to-win-the-heart-of-a-latina.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/how-to-date-passionate-colombian-women-successfully.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/how-to-date-latinas-while-traveling-latin-america.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/how-do-you-meet-latina-match.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/foreigner-guide-to-dating-latinas.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/foreign-men-escape-from-the-west.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/find-your-latina-soulmate-speed-dating-in-mexico-city.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/exploring-machu-picchu-peru-solo-travel.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/experience-a-great-vacation-in-latin-america.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/exclusive-the-actual-happenings-in-a-costa-rica-tour.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/elite-matchmaker-pairs-men-with-serious-colombian-women.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/do-women-date-foreigners-to-leave-colombia.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/dating-latinas-in-barranquilla-too-much-affection-so-soon.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/dating-latinas-how-to-date-mexican-women-the-right-way.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/dating-latin-women-in-peru.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/dating-hundreds-of-latina-women-in-one-night.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/dating-colombian-women-guatape-dream-date.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/date-ideas-with-latinas-in-cartagena-colombia.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/costa-rican-women-as-wives-1st-latin-women.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/costa-rica-safe-to-travel.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/content-informational.php",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/colombian-women-hate-dating-men-like-this.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/cartagena-colombia-tour-experience.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/can-you-date-colombian-women-without-apps.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/biggest-mistake-passport-bros-make-dating-latinas.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/beautiful-colombian-women-for-marriage.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/bachelors-guide-to-costa-rican-travel-san-jose-solo-trip.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/avoid-this-if-dating-latin-women.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/ambitious-colombian-women-date-foreign-men.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/8-interesting-costa-rican-facts-you-might-not-know.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/3-demands-of-latinas-you-ll-date-in-colombia.html",
  "https://1stlatinwomen.com/1stlatinwomen-videos/informational/are-latinas-truly-different-from-your-local-dating-scene.html",
  "https://1stlatinwomen.com/1stlatin-women-tour-photo/costa-rica-tour-photo.html",
  "https://1stlatinwomen.com/1stlatin-women-tour-photo/",
  "https://1stlatinwomen.com/1stlatin-women-tour-photo/peru-tour-photo.html",
  "https://1stlatinwomen.com/1stlatin-women-tour-photo/colombia-tour-photo.html",
  "https://1stlatinwomen.com/execu/professional-matchmaker-plan.html",
  "https://1stlatinwomen.com/execu/cost.html",
  "https://1stlatinwomen.com/execu/why-us.html",
  "https://1stlatinwomen.com/execu/the-process.html",
  "https://1stlatinwomen.com/execu/meet-our-matchmakers.html",
  "https://1stlatinwomen.com/search-latin-women-seeking-men/search-women-worldwide.html",
  "https://1stlatinwomen.com/featured-ladies/1lw-yt111-featured-costa-rican-girls-san-jose-dating.html",
  "https://1stlatinwomen.com/featured-ladies/1LW099-Featured-Colombian-Women-From-Cartagena-Socials.html",
  "https://1stlatinwomen.com/featured-ladies/1LW096-Featured-Colombian-Women.html",
  "https://1stlatinwomen.com/featured-ladies/1LW-YT056.html",
  "https://1stlatinwomen.com/featured-ladies/1LW-YT055.html",
  "https://1stlatinwomen.com/featured-ladies/1LW-YT054.html",
  "https://1stlatinwomen.com/featured-ladies/1LW-YT074-JULY2022TourVideos.html",
  "https://1stlatinwomen.com/featured-ladies/1LW-YT064.html",
  "https://1stlatinwomen.com/featured-ladies/1LW-YT058.html",
  "https://1stlatinwomen.com/featured-ladies/1LW082-Featured-Colombian-Women.html",
  "https://1stlatinwomen.com/featured-ladies/1LW080-Featured-Peruvian-Ladies.html",
  "https://1stlatinwomen.com/featured-ladies/1LW-YTProfiles01.html",
  "https://1stlatinwomen.com/featured-ladies/1LW-YT074.html",
  "https://1stlatinwomen.com/",
  "https://1stlatinwomen.com/travel-to-latin-america.html",
  "https://1stlatinwomen.com/women-in-latin-america.html",
  "https://1stlatinwomen.com/new-single-girls-for-marriage-worldwide.html",
  "https://1stlatinwomen.com/live-webcast.html",
  "https://1stlatinwomen.com/latin-women-marriage-culture.html",
  "https://1stlatinwomen.com/latin-women-dating-culture.html",
  "https://1stlatinwomen.com/latin-women-brides.html",
  "https://1stlatinwomen.com/history-of-matchmaking.html",
  "https://1stlatinwomen.com/dating-women-in-Latin-America.html",
  "https://1stlatinwomen.com/craigslist-women-seeking-men-vs-latin-women.html",
  "https://1stlatinwomen.com/new-1stlatinwomen.html",
  "https://1stlatinwomen.com/how-to-meet-latin-women.html",
  "https://1stlatinwomen.com/date-latin-women.html",
  "https://1stlatinwomen.com/latin-women-tours.html",
  "https://1stlatinwomen.com/about-1stlatinwomen.html",
  "https://1stlatinwomen.com/latin-women-singles.html",
  "https://1stlatinwomen.com/search-single-foreign-women-worldwide.html",
  "https://1stlatinwomen.com/single-latin-girls.html",
  "https://1stlatinwomen.com/latin-women-in-love.html",
  "https://1stlatinwomen.com/marry-younger-latin-women.html",
  "https://1stlatinwomen.com/sign-up.html",
  "https://1stlatinwomen.com/best-latin-matchmakers.html"
]
OUTPUT_FILE = "pagespeed_results.md"

def run_pagespeed_report(target_url, strategy, api_key):
    api_endpoint = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
    params = {'url': target_url, 'strategy': strategy, 'key': api_key}
    
    print(f"  Fetching {strategy} for {target_url}...")
    response = requests.get(api_endpoint, params=params)
    
    if response.status_code != 200:
        return None

    json_data = response.json()
    
    # Extracting Data
    loading_exp = json_data.get('loadingExperience', {}).get('metrics', {})
    lh_result = json_data.get('lighthouseResult', {})
    lh_audits = lh_result.get('audits', {})
    
    # Get Overall Performance Score (converted to 0-100 scale)
    perf_score = lh_result.get('categories', {}).get('performance', {}).get('score')
    overall_performance = int(perf_score * 100) if perf_score is not None else "N/A"
    
    encoded_url = urllib.parse.quote(target_url, safe='')
    
    return {
        "strategy": strategy,
        "overall_performance": overall_performance,
        "report_link": f"https://pagespeed.web.dev/analysis?url={encoded_url}&strategy={strategy}&form_factor={strategy}",
        "fcp_field": loading_exp.get('FIRST_CONTENTFUL_PAINT_MS', {}).get('category', 'N/A'),
        "inp_field": loading_exp.get('INTERACTION_TO_NEXT_PAINT', {}).get('category', 'N/A'),
        "fcp_lab": lh_audits.get('first-contentful-paint', {}).get('displayValue', 'N/A'),
        "lcp_lab": lh_audits.get('largest-contentful-paint', {}).get('displayValue', 'N/A'),
        "tbt_lab": lh_audits.get('total-blocking-time', {}).get('displayValue', 'N/A')
    }

# --- CONFIGURATION ---
OUTPUT_DIR = "all_json_reports"
if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

md_content = "# PageSpeed Insights Automation Report\n\n"
md_content += f"*Generated on: {time.strftime('%Y-%m-%d %H:%M:%S')}*\n\n"

for site in URLS:
    # Fetch results
    m = run_pagespeed_report(site, 'mobile', API_KEY)
    d = run_pagespeed_report(site, 'desktop', API_KEY)
    
    if m and d:
        # 1. Create a single filename for this site
        file_name = site.replace("https://", "").replace("http://", "").replace("/", "_").replace(":", "_") + ".json"
        json_file_path = os.path.join(OUTPUT_DIR, file_name)

        # 2. Structure JSON with Overall Performance
        report_data = {
            "site": site,
            "timestamp": time.strftime('%Y-%m-%d %H:%M:%S'),
            "summary": {
                "mobile_score": m['overall_performance'],
                "desktop_score": d['overall_performance']
            },
            "mobile_details": m,
            "desktop_details": d
        }
        
        with open(json_file_path, "w", encoding="utf-8") as jf:
            json.dump(report_data, jf, indent=4)

        # Build Markdown Table (Optional: Added Performance Score column)
        md_content += f"## Site: {site}\n\n"
        md_content += "| Metric | Mobile | Desktop |\n"
        md_content += "| :--- | :--- | :--- |\n"
        md_content += f"| **Perf Score** | **{m['overall_performance']}** | **{d['overall_performance']}** |\n"
        md_content += f"| Report Link | [View Mobile]({m['report_link']}) | [View Desktop]({d['report_link']}) |\n"
        md_content += f"| Field FCP | {m['fcp_field']} | {d['fcp_field']} |\n"
        md_content += f"| Lab LCP | {m['lcp_lab']} | {d['lcp_lab']} |\n\n"
    else:
        md_content += f"## Site: {site}\n\nError: Could not fetch data.\n\n"
    
    time.sleep(1)

# Write Markdown Summary
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    f.write(md_content)

print(f"\n✅ All JSON reports compiled in: {OUTPUT_DIR}/")