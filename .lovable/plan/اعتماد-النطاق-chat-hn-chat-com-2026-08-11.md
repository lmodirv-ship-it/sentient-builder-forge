# اعتماد النطاق chat.hn-chat.com

النطاق `chat.hn-chat.com` مربوط بالمشروع بالفعل ويعمل. ما ينقص هو أن يستخدمه التطبيق نفسه كعنوان رسمي بدل عنوان lovable.app.

## ما سيتم

1. **تطبيق ويندوز (Electron)** — `electron/main.cjs` يفتح حاليًا `https://sentient-builder-forge.lovable.app`. سيصبح `https://chat.hn-chat.com` (مع إبقاء عنوان lovable كاحتياطي عند فشل التحميل).
2. **تطبيق أندرويد (Capacitor)** — `capacitor.config.ts` يشير إلى نفس عنوان lovable. سيصبح `https://chat.hn-chat.com`.
3. **SEO** — إضافة وسم canonical و `og:url` بالنطاق الجديد في `src/routes/__root.tsx`، وإضافة `public/robots.txt` يشير إلى `https://chat.hn-chat.com/sitemap.xml`.
4. **مانيفست PWA** — التأكد من أن `start_url` و`scope` نسبيان حتى يعملا على النطاق الجديد.

## تفاصيل تقنية

- ثابت واحد `SITE_URL = "https://chat.hn-chat.com"` يُستخدم في Electron وCapacitor وميتاداتا الجذر بدل تكرار العنوان.
- لا تغيير في مفاتيح HN ولا في منطق الاستوديو أو محرك التطوير.
- بعد التعديل تحتاج إعادة تغليف حزمتي EXE وAPK لالتقاط العنوان الجديد — أخبرني إن أردت إنتاجهما في نفس الجولة.
