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
  "https://medellinsingles.com/medellin-women-videos/tours/dating-medellin-women-youre-signing.html",
  "https://medellinsingles.com/medellin-women-videos/tours/fast-qanda-showing-latinas-true-colors.html",
  "https://medellinsingles.com/medellin-women-videos/tours/go-loco-dating-colombian-women-in-medellin.html",
  "https://medellinsingles.com/medellin-women-videos/tours/magic-of-medellin-colombian-women-catch-feelings.html",
  "https://medellinsingles.com/medellin-women-videos/tours/magical-night-latinas-magic-city-medellin.html",
  "https://medellinsingles.com/medellin-women-videos/tours/many-beautiful-medellin-latinas.html",
  "https://medellinsingles.com/medellin-women-videos/tours/medellin-changed-life-dating-latinas-colombia.html",
  "https://medellinsingles.com/medellin-women-videos/tours/medellin-dating-hack-successfully-date-colombian-women.html",
  "https://medellinsingles.com/medellin-women-videos/tours/meeting-200-women-in-medellin-colombia-never-a-disappointment.html",
  "https://medellinsingles.com/medellin-women-videos/tours/millions-of-medellin-women-are-dating-foreigners-in-colombia.html",
  "https://medellinsingles.com/medellin-women-videos/tours/must-see-destinations-in-medellin-colombia-travel-vlog.html",
  "https://medellinsingles.com/medellin-women-videos/tours/my-medellin-dating-adventure-solo-travel-colombia.html",
  "https://medellinsingles.com/medellin-women-videos/tours/the-right-way-to-enjoy-dating-colombian-women.html",
  "https://medellinsingles.com/medellin-women-videos/tours/too-many-wife-material-colombian-women.html",
  "https://medellinsingles.com/medellin-women-videos/tours/whats-great-medellin-dating-colombian-women.html",
  "https://medellinsingles.com/medellin-women-videos/tours/yeah-colombia-girls-want-better-lives.html",
  "https://medellinsingles.com/medellin-women-videos/",
  "https://medellinsingles.com/medellin-women-videos/testimonial/4-hrs-in-colombia-expanded-my-dating-options.html",
  "https://medellinsingles.com/medellin-women-videos/testimonial/cant-stay-away-why-guys-love-colombian-solo-travel.html",
  "https://medellinsingles.com/medellin-women-videos/testimonial/disappointed-colombian-women-over-few-foreign-men.html",
  "https://medellinsingles.com/medellin-women-videos/testimonial/discovering-colombia-dating-latinas-medellin.html",
  "https://medellinsingles.com/medellin-women-videos/testimonial/dont-wait-face-to-face-with-colombian-women.html",
  "https://medellinsingles.com/medellin-women-videos/testimonial/i-met-many-gorgeous-latina-women-from-medellin.html",
  "https://medellinsingles.com/medellin-women-videos/testimonial/international-dating-the-best-part-of-dating-colombian-women.html",
  "https://medellinsingles.com/medellin-women-videos/testimonial/just-go-americans-advise-men-seeking-colombian-women.html",
  "https://medellinsingles.com/medellin-women-videos/testimonial/latin-ultimate-destination-dating-100-hot-colombian.html",
  "https://medellinsingles.com/medellin-women-videos/testimonial/medellin-dating-dos-and-donts-colombian-women.html",
  "https://medellinsingles.com/medellin-women-videos/testimonial/met-160-colombian-women-trip-medellin-colombia.html",
  "https://medellinsingles.com/medellin-women-videos/testimonial/reality-vs-youtube-dating-colombian-girls-irl.html",
  "https://medellinsingles.com/medellin-women-videos/testimonial/things-i-ignored-to-date-better-colombian-women.html",
  "https://medellinsingles.com/medellin-women-videos/testimonial/time-online-dating-colombian-women-work.html",
  "https://medellinsingles.com/medellin-women-videos/testimonial/unexpected-love-dating-colombian-women-in-medellin.html",
  "https://medellinsingles.com/medellin-women-videos/testimonial/what-no-man-admits-about-colombian-women.html",
  "https://medellinsingles.com/medellin-women-videos/testimonial/worth-every-mile-americans-date-feminine-colombian-women.html",
  "https://medellinsingles.com/medellin-women-videos/testimonial/youre-not-used-medellin-latina-mindset.html",
  "https://medellinsingles.com/medellin-women-videos/testimonial/",
  "https://medellinsingles.com/medellin-women-videos/informational/24-yo-latina-homebody-wants-you-in-colombia.html",
  "https://medellinsingles.com/medellin-women-videos/informational/33-yo-colombiana-craves-calm-foreign-boyfriend.html",
  "https://medellinsingles.com/medellin-women-videos/informational/37-yo-colombianas-dating-deal-breakers.html",
  "https://medellinsingles.com/medellin-women-videos/informational/48-yo-latinas-3-dating-demands.html",
  "https://medellinsingles.com/medellin-women-videos/informational/are-colombian-girls-wife-material.html",
  "https://medellinsingles.com/medellin-women-videos/informational/are-colombian-women-too-old-school-for-americans.html",
  "https://medellinsingles.com/medellin-women-videos/informational/are-you-what-colombian-women-want.html",
  "https://medellinsingles.com/medellin-women-videos/informational/best-date-spots-in-medellin-dating-colombian-women.html",
  "https://medellinsingles.com/medellin-women-videos/informational/bquilla-bound-colombian-girls-breakdown-barranquilla-dating.html",
  "https://medellinsingles.com/medellin-women-videos/informational/can-23-yo-colombian-career-woman-balance-love.html",
  "https://medellinsingles.com/medellin-women-videos/informational/can-date-colombian-girls-safely.html",
  "https://medellinsingles.com/medellin-women-videos/informational/can-offer-wife-colombian-girls-react.html",
  "https://medellinsingles.com/medellin-women-videos/informational/can-you-trust-your-colombian-women-matchmakers.html",
  "https://medellinsingles.com/medellin-women-videos/informational/choosing-date-among-50-gorgeous-latinas.html",
  "https://medellinsingles.com/medellin-women-videos/informational/colombian-girls-flee-dating-apps-meet-guys-face-face.html",
  "https://medellinsingles.com/medellin-women-videos/informational/colombian-girls-humbled-affection-colombia-dating.html",
  "https://medellinsingles.com/medellin-women-videos/informational/colombian-girls-tackle-latina-dating-stereotypes-medellin.html",
  "https://medellinsingles.com/medellin-women-videos/informational/colombian-nurse-seeks-love-that-lasts.html",
  "https://medellinsingles.com/medellin-women-videos/informational/colombian-women-40-want-everyday-medellin-latinas.html",
  "https://medellinsingles.com/medellin-women-videos/informational/colombian-women-crave-equality-not-control.html",
  "https://medellinsingles.com/medellin-women-videos/informational/colombian-women-crave-for-your-attention.html",
  "https://medellinsingles.com/medellin-women-videos/informational/colombian-women-prefer-dating-passport-bros.html",
  "https://medellinsingles.com/medellin-women-videos/informational/colombian-women-reveal-biggest-mistakes-men-make-in-medellin.html",
  "https://medellinsingles.com/medellin-women-videos/informational/dating-70-colombian-women-month-2021.html",
  "https://medellinsingles.com/medellin-women-videos/informational/dating-colombian-girls-without-apps-single-latinas-explain.html",
  "https://medellinsingles.com/medellin-women-videos/informational/dating-colombian-women-effortlessly.html",
  "https://medellinsingles.com/medellin-women-videos/informational/dating-colombian-women-must-know-deal-breakers.html",
  "https://medellinsingles.com/medellin-women-videos/informational/dating-latinas-how-colombian-women-treat-foreign-men.html",
  "https://medellinsingles.com/medellin-women-videos/informational/dating-sexy-latinas-in-medellin.html",
  "https://medellinsingles.com/medellin-women-videos/informational/delete-dating-apps-colombian-girls-find-safer-options.html",
  "https://medellinsingles.com/medellin-women-videos/informational/do-colombian-women-find-zero-good-guys-in-medellin.html",
  "https://medellinsingles.com/medellin-women-videos/informational/do-your-local-women-sound-like-her.html",
  "https://medellinsingles.com/medellin-women-videos/informational/dont-be-nervous-dating-colombian-women-confidently.html",
  "https://medellinsingles.com/medellin-women-videos/informational/dont-get-stuck-online-real-deal-dating-latinas-in-medellin-colombia.html",
  "https://medellinsingles.com/medellin-women-videos/informational/dont-wait-dating-in-medellin-colombia.html",
  "https://medellinsingles.com/medellin-women-videos/informational/english-speaking-colombian-woman-wants-you-to-move-to-medellin.html",
  "https://medellinsingles.com/medellin-women-videos/informational/exposed-why-colombian-women-join-foreign-dating-sites.html",
  "https://medellinsingles.com/medellin-women-videos/informational/foreign-dating-in-medellin-colombia-keep-your-common-sense.html",
  "https://medellinsingles.com/medellin-women-videos/informational/free-colombian-dating-sites-can-cost-you-everything.html",
  "https://medellinsingles.com/medellin-women-videos/informational/get-help-dating-latina-women.html",
  "https://medellinsingles.com/medellin-women-videos/informational/get-know-colombian-women-maria-part-1.html",
  "https://medellinsingles.com/medellin-women-videos/informational/hardest-dating-decision-colombia-many-latinas.html",
  "https://medellinsingles.com/medellin-women-videos/informational/homebody-colombiana-opens-heart-to-foreign-love.html",
  "https://medellinsingles.com/medellin-women-videos/informational/how-colombian-girls-act-after-marriage.html",
  "https://medellinsingles.com/medellin-women-videos/informational/how-to-turn-down-300-colombian-women-gently.html",
  "https://medellinsingles.com/medellin-women-videos/informational/i-pay-a-lot-colombian-women-devoted-to-dating-foreigners.html",
  "https://medellinsingles.com/medellin-women-videos/informational/i-want-a-family-educated-colombian-women-seek-love.html",
  "https://medellinsingles.com/medellin-women-videos/informational/i-want-something-different-colombian-girls-seek-foreigners.html",
  "https://medellinsingles.com/medellin-women-videos/informational/ideal-holiday-presents-colombian-women.html",
  "https://medellinsingles.com/medellin-women-videos/informational/independent-colombian-woman-seeks-foreign-love.html",
  "https://medellinsingles.com/medellin-women-videos/informational/interesting-questions-to-ask-single-colombian-women.html",
  "https://medellinsingles.com/medellin-women-videos/informational/is-colombia-safe-dating-medellin-women-as-a-foreigner.html",
  "https://medellinsingles.com/medellin-women-videos/informational/is-dating-in-colombia-a-wreckless-choice.html",
  "https://medellinsingles.com/medellin-women-videos/informational/latina-reveals-living-usa-vs-colombia.html",
  "https://medellinsingles.com/medellin-women-videos/informational/latina-spews-dating-truths-foreigners-colombiana-hot-mic.html",
  "https://medellinsingles.com/medellin-women-videos/informational/latina-treats-like-king-dating-colombian-women.html",
  "https://medellinsingles.com/medellin-women-videos/informational/latina-urges-foreign-men-to-date-in-colombia.html",
  "https://medellinsingles.com/medellin-women-videos/informational/latinas-are-coming-to-be-with-you.html",
  "https://medellinsingles.com/medellin-women-videos/informational/latinas-over-30-shift-dating-expectations.html",
  "https://medellinsingles.com/medellin-women-videos/informational/latinas-say-yes.html",
  "https://medellinsingles.com/medellin-women-videos/informational/lets-together-colombian-womens-ideal-marriage.html",
  "https://medellinsingles.com/medellin-women-videos/informational/love-flows-magic-city-medellin-dating-colombian-women.html",
  "https://medellinsingles.com/medellin-women-videos/informational/love-yourself-before-i-love-you-colombian-girl-sounds-off.html",
  "https://medellinsingles.com/medellin-women-videos/informational/lovely-30-year-old-medellin-latinas-seek-love.html",
  "https://medellinsingles.com/medellin-women-videos/informational/make-latinas-say-yes-to-dates-with-you.html",
  "https://medellinsingles.com/medellin-women-videos/informational/medellin-colombia-dating-can-you-find-matches-chatting.html",
  "https://medellinsingles.com/medellin-women-videos/informational/medellin-latina-wants-a-man-who-loves-himself.html",
  "https://medellinsingles.com/medellin-women-videos/informational/more-medellin-women-are-eager-to-join-international-dating.html",
  "https://medellinsingles.com/medellin-women-videos/informational/newly-single-colombiana-reacts-dating-foreigners.html",
  "https://medellinsingles.com/medellin-women-videos/informational/no-option-colombian-girls-ready-marriage.html",
  "https://medellinsingles.com/medellin-women-videos/informational/one-night-in-medellin-100s-of-colombian-women-speed-dating.html",
  "https://medellinsingles.com/medellin-women-videos/informational/only-if-youre-honest-colombian-latinas-dating-foreigners.html",
  "https://medellinsingles.com/medellin-women-videos/informational/problem-colombian-women-dating-dilemma.html",
  "https://medellinsingles.com/medellin-women-videos/informational/right-passport-bros.html",
  "https://medellinsingles.com/medellin-women-videos/informational/sapiosexual-colombiana-on-first-time-dating-foreigners.html",
  "https://medellinsingles.com/medellin-women-videos/informational/secure-second-dates-with-colombian-women-everytime.html",
  "https://medellinsingles.com/medellin-women-videos/informational/serving-him-is-my-love-language.html",
  "https://medellinsingles.com/medellin-women-videos/informational/sexiest-single-women-in-medellin-colombia.html",
  "https://medellinsingles.com/medellin-women-videos/informational/shes-looking-real-man.html",
  "https://medellinsingles.com/medellin-women-videos/informational/should-you-believe-it-latinas-on-barranquilla-dating-hype.html",
  "https://medellinsingles.com/medellin-women-videos/informational/simple-dating-standards-colombian-women-men-exceed.html",
  "https://medellinsingles.com/medellin-women-videos/informational/speed-dating-colombian-women-post-pandemic.html",
  "https://medellinsingles.com/medellin-women-videos/informational/strong-and-independent-colombian-women-heard-about-you.html",
  "https://medellinsingles.com/medellin-women-videos/informational/the-best-way-to-date-a-latina.html",
  "https://medellinsingles.com/medellin-women-videos/informational/this-man-is-her-weakness-colombiana-hot-mic.html",
  "https://medellinsingles.com/medellin-women-videos/informational/two-types-which-colombian-girl-matches-you.html",
  "https://medellinsingles.com/medellin-women-videos/informational/updated-dating-profiles-of-single-latinas-under-30.html",
  "https://medellinsingles.com/medellin-women-videos/informational/want-pamper-medellin-latinas-long-love.html",
  "https://medellinsingles.com/medellin-women-videos/informational/way-colombian-womens-hearts-dance.html",
  "https://medellinsingles.com/medellin-women-videos/informational/what-attracts-sexy-latinas-medellin-colombia.html",
  "https://medellinsingles.com/medellin-women-videos/informational/what-pushed-afro-latina-to-date-outside-colombia.html",
  "https://medellinsingles.com/medellin-women-videos/informational/where-to-take-colombian-women-on-second-dates.html",
  "https://medellinsingles.com/medellin-women-videos/informational/whos-the-better-bachelor-colombian-women-tell-all.html",
  "https://medellinsingles.com/medellin-women-videos/informational/why-colombian-women-choose-to-date-you.html",
  "https://medellinsingles.com/medellin-women-videos/informational/why-colombian-women-want-foreigners.html",
  "https://medellinsingles.com/medellin-women-videos/informational/will-chivalry-work-dating-latinas-online.html",
  "https://medellinsingles.com/medellin-women-videos/informational/wing-women-medellin-colombian-dating.html",
  "https://medellinsingles.com/medellin-women-videos/informational/youll-delete-your-dating-app-immediately-in-medellin.html",
  "https://medellinsingles.com/medellin-women-videos/informational/youll-get-100-colombiana-pledges-love-to-foreigner.html",
  "https://medellinsingles.com/medellin-women-videos/informational/",
  "https://medellinsingles.com/dating/love-advice-how-to-comfort-a-heartbroken-woman.html",
  "https://medellinsingles.com/dating/win-medellin-womans-heart.html",
  "https://medellinsingles.com/dating/why-experience-mature-dating-with-latinas.html",
  "https://medellinsingles.com/dating/why-date-latina-women-from-medellin.html",
  "https://medellinsingles.com/dating/why-colombian-women-prefer-older-men.html",
  "https://medellinsingles.com/dating/why-colombian-women-overlook-physical-appearance.html",
  "https://medellinsingles.com/dating/types-of-men-latin-women-want-to-date.html",
  "https://medellinsingles.com/dating/things-to-avoid-when-dating-colombian-women.html",
  "https://medellinsingles.com/dating/realistic-expectations-dating-colombian-women.html",
  "https://medellinsingles.com/dating/planning-your-first-date-with-a-colombian-woman.html",
  "https://medellinsingles.com/dating/online-dating-understanding-the-ins-and-outs.html",
  "https://medellinsingles.com/dating/online-dating-better-option.html",
  "https://medellinsingles.com/dating/attract-the-interest-of-colombian-women.html",
  "https://medellinsingles.com/dating/best-time-to-meet-women-in-medellin.html",
  "https://medellinsingles.com/dating/bounce-back-with-latinas.html",
  "https://medellinsingles.com/dating/date-ideas-colombian-women-love.html",
  "https://medellinsingles.com/dating/dating-colombian-women-fails.html",
  "https://medellinsingles.com/dating/dating-tips-minimize-overthinking.html",
  "https://medellinsingles.com/dating/dating-tips-what-not-to-say.html",
  "https://medellinsingles.com/dating/gringo-edge-dating-colombian-women.html",
  "https://medellinsingles.com/dating/group-dating-with-colombia-women.html",
  "https://medellinsingles.com/dating/how-to-find-love-in-medellin.html",
  "https://medellinsingles.com/dating/how-to-have-the-best-dates.html",
  "https://medellinsingles.com/dating/love-or-lust-dating-colombian-women.html",
  "https://medellinsingles.com/dating/making-good-first-impressions-on-colombian-women.html",
  "https://medellinsingles.com/dating/mature-dating-guide.html",
  "https://medellinsingles.com/dating/meet-women-how-to-keep-your-cool.html",
  "https://medellinsingles.com/dating/things-a-colombian-woman-will-appreciate-on-valentines.html",
  "https://medellinsingles.com/dating/most-beautiful-medellin-colombia-women.html",
  "https://medellinsingles.com/dating/get-your-friends-and-family-onboard-with-your-foreign-wife.html",
  "https://medellinsingles.com/dating/dating-medellin-women.html",
  "https://medellinsingles.com/dating/dating-colombian-woman.html",
  "https://medellinsingles.com/dating/beautiful-women-in-medellin-colombia.html",
  "https://medellinsingles.com/dating/accessorize-when-dating-a-colombian-woman.html",
  "https://medellinsingles.com/dating/how-long-does-a-crush-last.html",
  "https://medellinsingles.com/dating/how-to-act-when-meeting-colombian-girls.html",
  "https://medellinsingles.com/dating/how-to-prepare-your-home-for-your-colombian-bride.html",
  "https://medellinsingles.com/dating/how-to-win-over-local-singles-of-medellin.html",
  "https://medellinsingles.com/dating/learn-from-colombian-men.html",
  "https://medellinsingles.com/dating/meet-single-medellin-women-online.html",
  "https://medellinsingles.com/dating/meeting-a-single-woman-near-me.html",
  "https://medellinsingles.com/dating/questions-to-ask-a-girl-over-text.html",
  "https://medellinsingles.com/dating/spanish-phrases-to-use-while-dating-women-in-medellin.html",
  "https://medellinsingles.com/dating/ways-to-attract-beautiful-colombian-woman.html",
  "https://medellinsingles.com/dating/what-colombian-women-look-for-in-a-partner.html",
  "https://medellinsingles.com/dating/why-foreign-ladies-are-a-better-catch.html",
  "https://medellinsingles.com/dating/win-heart-of-medellin-women.html",
  "https://medellinsingles.com/dating/women-in-medellin-colombia-are-for-keeps.html",
  "https://medellinsingles.com/dating/immature-dating-habits-men-must-seriously-leave-behind.html",
  "https://medellinsingles.com/dating/how-to-approach-a-colombian-woman.html",
  "https://medellinsingles.com/dating/why-should-a-man-always-make-the-first-move.html",
  "https://medellinsingles.com/dating/when-do-you-ask-someone-to-be-your-valentine.html",
  "https://medellinsingles.com/dating/how-to-get-to-know-colombian-ladies.html",
  "https://medellinsingles.com/dating/sartorial-rules-to-follow-when-dating-women.html",
  "https://medellinsingles.com/dating/meet-women-near-me.html",
  "https://medellinsingles.com/dating/date-ideas-valentines-day-colombia.html",
  "https://medellinsingles.com/dating/a-guide-to-making-a-move-on-women.html",
  "https://medellinsingles.com/dating/what-you-need-to-know-about-dating-medellin-cartagena-women.html",
  "https://medellinsingles.com/dating/20th-anniversary-gift-ideas.html",
  "https://medellinsingles.com/dating/how-to-get-your-crush-to-like-you.html",
  "https://medellinsingles.com/dating/workouts-to-be-more-attractive-to-colombian-women.html",
  "https://medellinsingles.com/dating/good-habits-of-women-good-advice-for-men.html",
  "https://medellinsingles.com/dating/top-relationship-goals-for-couples.html",
  "https://medellinsingles.com/dating/ways-to-make-a-woman-happy.html",
  "https://medellinsingles.com/dating/signs-your-crush-doesnt-like-you.html",
  "https://medellinsingles.com/dating/medellin-dating-meet-beautiful-women.html",
  "https://medellinsingles.com/dating/beauty-of-experience-discovering-fun-with-older-women.html",
  "https://medellinsingles.com/dating/how-long-does-crush-last.html",
  "https://medellinsingles.com/dating/first-date-outfits-guys-love.html",
  "https://medellinsingles.com/dating/colombian-clothing-culture.html",
  "https://medellinsingles.com/dating/tired-of-being-single.html",
  "https://medellinsingles.com/dating/guide-to-dating-beautiful-women-from-medellin.html",
  "https://medellinsingles.com/dating/quotes-about-starting-over-in-relationship.html",
  "https://medellinsingles.com/dating/colombian-women-most-beautiful-in-the-world.html",
  "https://medellinsingles.com/dating/mistakes-men-make-on-first-date.html",
  "https://medellinsingles.com/dating/signs-of-falling-in-love.html",
  "https://medellinsingles.com/dating/signs-you-are-ready-for-relationship.html",
  "https://medellinsingles.com/dating/discover-the-charm-and-beauty-of-medellin-colombia-women.html",
  "https://medellinsingles.com/dating/how-to-reconnect-after-a-relationship-break.html",
  "https://medellinsingles.com/dating/how-to-start-over-in-relationship.html",
  "https://medellinsingles.com/dating/ghosting-what-to-do.html",
  "https://medellinsingles.com/dating/knowing-long-distance-relationship.html",
  "https://medellinsingles.com/dating/emotional-intelligence-relationships.html",
  "https://medellinsingles.com/dating/find-one-show-love-broke.html",
  "https://medellinsingles.com/dating/guilty-pleasure-leaves-wanting.html",
  "https://medellinsingles.com/dating/latina-hits-different.html",
  "https://medellinsingles.com/dating/muscular-men-attractive-women-want.html",
  "https://medellinsingles.com/dating/can-find-love-bottom-bottle.html",
  "https://medellinsingles.com/dating/can-love-woman-nothing-offer.html",
  "https://medellinsingles.com/dating/normalize-dating-multiple-women.html",
  "https://medellinsingles.com/dating/overcoming-betrayal.html",
  "https://medellinsingles.com/dating/understand-what-women-want-relationship.html",
  "https://medellinsingles.com/dating/using-watch-signs-relationship.html",
  "https://medellinsingles.com/dating/worst-can-say-no-ask.html",
  "https://medellinsingles.com/dating/respond-criticism-relationships.html",
  "https://medellinsingles.com/dating/rizz-pickup-lines.html",
  "https://medellinsingles.com/dating/best-gifts-women.html",
  "https://medellinsingles.com/dating/celebrating-milestones-together.html",
  "https://medellinsingles.com/dating/dating-single-mom-date-night-ideas.html",
  "https://medellinsingles.com/dating/talk-cant-talk-women.html",
  "https://medellinsingles.com/dating/the-ultimate-guide-to-dating-colombian-women.html",
  "https://medellinsingles.com/psychology/why-medellin-women-are-beautiful.html",
  "https://medellinsingles.com/psychology/traits-colombian-women.html",
  "https://medellinsingles.com/psychology/texts-to-get-him-chasing-you.html",
  "https://medellinsingles.com/psychology/questions-girls-afraid-to-ask-guys.html",
  "https://medellinsingles.com/psychology/medellin-women-worth-your-time.html",
  "https://medellinsingles.com/psychology/make-him-miss-you.html",
  "https://medellinsingles.com/psychology/having-fun-with-older-women.html",
  "https://medellinsingles.com/psychology/beautiful-mature-women-of-colombia-want-you.html",
  "https://medellinsingles.com/psychology/colombian-women-local-single-women.html",
  "https://medellinsingles.com/psychology/quit-playing-games-fix-start-finding-love.html",
  "https://medellinsingles.com/psychology/women-from-medellin-how-they-think-and-love.html",
  "https://medellinsingles.com/psychology/arguments-relationships-can-healthy.html",
  "https://medellinsingles.com/psychology/girlfriend-bad-mood-refusing-say.html",
  "https://medellinsingles.com/psychology/girlfriend-effect-real.html",
  "https://medellinsingles.com/psychology/love-affirmations-relationship.html",
  "https://medellinsingles.com/psychology/insecurities-relationship-root-problems.html",
  "https://medellinsingles.com/psychology/playing-hard-get-work.html",
  "https://medellinsingles.com/psychology/men-risk-temporary-satisfaction-affair.html",
  "https://medellinsingles.com/psychology/woman-prime-discover-peak-milestones.html",
  "https://medellinsingles.com/psychology/role-humor-relationships.html",
  "https://medellinsingles.com/realities/things-men-should-know-before-marrying-colombian-women.html",
  "https://medellinsingles.com/realities/being-single-affects-your-health.html",
  "https://medellinsingles.com/realities/foreign-women-dating-service.html",
  "https://medellinsingles.com/realities/international-matchmaking-vs-dating-apps.html",
  "https://medellinsingles.com/realities/man-should-get-married.html",
  "https://medellinsingles.com/realities/marriage-brings-happiness.html",
  "https://medellinsingles.com/realities/meet-second-wife.html",
  "https://medellinsingles.com/realities/micro-cheating-still-cheating.html",
  "https://medellinsingles.com/realities/realities-of-overseas-dating-for-american-men.html",
  "https://medellinsingles.com/realities/stagnant-relationship.html",
  "https://medellinsingles.com/realities/can-men-victims-violence-intimate-relationships.html",
  "https://medellinsingles.com/realities/cohabitation.html",
  "https://medellinsingles.com/realities/cross-cultural-differences.html",
  "https://medellinsingles.com/realities/dating-single-dad-doable-begin.html",
  "https://medellinsingles.com/realities/ending-situationship-ghosting-best-option.html",
  "https://medellinsingles.com/realities/finding-soulmate-ending-toxic-marriage.html",
  "https://medellinsingles.com/realities/hungry-love-single.html",
  "https://medellinsingles.com/realities/ai-girlfriend-simulator-real-women.html",
  "https://medellinsingles.com/realities/forming-relationship-overbearing-mother-law.html",
  "https://medellinsingles.com/realities/overcoming-financial-challenges-relationship.html",
  "https://medellinsingles.com/success-stories/best-client-testimonial-videos-and-success-stories.html",
  "https://medellinsingles.com/success-stories/",
  "https://medellinsingles.com/travel/what-to-know-about-christmas-lights-medellin.html",
  "https://medellinsingles.com/travel/places-to-meet-single-girls-medellin.html",
  "https://medellinsingles.com/travel/medellin-dating-destinations.html",
  "https://medellinsingles.com/travel/medellin-colombia-nightlife.html",
  "https://medellinsingles.com/travel/how-to-avoid-undesirable-situations-in-colombia.html",
  "https://medellinsingles.com/travel/having-a-meaningful-new-year-celebration-with-a-latina.html",
  "https://medellinsingles.com/travel/going-on-a-trip-with-someone-you-just-started-dating.html",
  "https://medellinsingles.com/travel/extreme-dates-with-colombian-women.html",
  "https://medellinsingles.com/travel/best-restaurants-in-medellin.html",
  "https://medellinsingles.com/travel/best-places-in-medellin-dates-with-colombian-women.html",
  "https://medellinsingles.com/travel/best-cities-meet-colombian-girls.html",
  "https://medellinsingles.com/travel/best-hotels-in-medellin.html",
  "https://medellinsingles.com/travel/is-medellin-colombia-safe.html",
  "https://medellinsingles.com/travel/is-colombia-safe-for-solo-female-travellers.html",
  "https://medellinsingles.com/travel/top-instagrammable-spots-in-medellin-colombia.html",
  "https://medellinsingles.com/travel/medellin-colombia-charming-appeal.html",
  "https://medellinsingles.com/travel",
  "https://medellinsingles.com/execu/cost.html",
  "https://medellinsingles.com/execu/meet-our-matchmakers.html",
  "https://medellinsingles.com/execu/professional-matchmaker-plan.html",
  "https://medellinsingles.com/execu/the-process.html",
  "https://medellinsingles.com/execu/why-us.html",
  "https://medellinsingles.com/featured-ladies/MS-YT042.html",
  "https://medellinsingles.com/featured-ladies/MS-YTProfiles01.html",
  "https://medellinsingles.com/featured-ladies/MS-YTProfiles02.html",
  "https://medellinsingles.com/featured-ladies/MS-YTProfiles03.html",
  "https://medellinsingles.com/our-process/meet-colombian-women-online-in-real-life.html",
  "https://medellinsingles.com/our-process/our-process-medellin-singles-dating-service.html",
  "https://medellinsingles.com/our-process/",
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
        "report_link": f"https://pagespeed.web.dev/analysis?url={encoded_url}&strategy={strategy}",
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