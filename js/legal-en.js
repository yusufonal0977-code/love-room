// English legal texts and About page. Shown for every language except Turkish.
// The Turkish version (legal.js) is the original; titles stay as Turkish keys so the interface translates them.

const DATE = 'October 29, 2026';
const CONTACT = 'eclipsoftware.dev@gmail.com';
const COMPANY = 'Eclip Software &amp; Entertainment Company';
const mail = `<a href="mailto:${CONTACT}">${CONTACT}</a>`;

export const LEGAL_EN = [
  {
    id: 'hakkimizda',
    title: 'Hakkımızda',
    html: `
<p><b>Get Love Room</b> is a small pixel home for couples who live miles apart. Walk around the same room, sit side by side on the sofa and watch a movie, listen to the same song, look at two different skies together from the balcony.</p>
<p>Get Love Room is made by <b>${COMPANY}</b>. Eclip is a tiny team, not a big company: a handful of people doing work they love.</p>
<p>A small confession: the developer who built this home is <b>single</b> right now. So every sofa, every mug and every shared flower in Get Love Room was built for someone else. If he ever moves into a Love Room of his own, we'll talk the cat into looking after him too; until then, your home is our favourite home. 🙂</p>
<p>How we work, in short:</p>
<ul>
  <li>No ads, we don't sell your data, and we don't use tracking analytics.</li>
  <li>Voice and video flow directly between your two devices; we don't record them.</li>
  <li>Your home belongs to you two: you can delete your photos and diary at any time.</li>
</ul>
<p>For ideas, bugs, or just to say hi: ${mail}</p>`,
  },
  {
    id: 'iletisim',
    title: 'İletişim',
    html: `
<p><b>${COMPANY}</b></p>
<p>Email: ${mail}</p>
<p>Write to this address for personal data requests, copyright notices, security reports, suggestions and complaints. We usually reply within a few days, and to legal requests within 30 days at the latest.</p>
<p>To delete your account and home from inside the app: Menu → <i>Delete my data</i>.</p>`,
  },
  {
    id: 'kosullar',
    title: 'Kullanım Koşulları',
    html: `
<p class="muted">Last updated: ${DATE}</p>
<h4>1. Parties and acceptance</h4>
<p>These terms set the rules between ${COMPANY} ("Eclip", "we") and you, the person using the Get Love Room app (the "Service"). By using the Service and ticking the box at sign-in, you accept these terms.</p>
<h4>2. Who can use it</h4>
<p>You must be <b>at least 18 years old</b>. A home belongs to at most two people; the person who creates it can invite one partner with the invite link.</p>
<h4>3. Your account</h4>
<p>You can sign in with Google or just with a name (guest). Guest accounts are tied to that browser; if you clear its data you may not be able to get back into your home. You are responsible for your account's security and for who you share your invite link with.</p>
<h4>4. Content you share</h4>
<p>Everything you add to the home (photos, drawings, diary entries, letters, answers) belongs to you and your partner; we don't take ownership. You only give us the limited permission needed to run the Service (store it and show it to your partner).</p>
<p>You agree not to:</p>
<ul>
  <li>upload or broadcast content you don't have the right to share (copyrighted movies, series, music, etc.),</li>
  <li>share unlawful or violent content, content involving child abuse, or hate speech,</li>
  <li>share or record intimate images of your partner without their consent,</li>
  <li>try to disrupt the Service, access other people's homes, or get around security measures.</li>
</ul>
<h4>5. Watching together, music and third-party sites</h4>
<p>Links, websites or screen shares added to the TV are played between the two users; we don't host, choose or review this content. <b>You are responsible</b> for making sure the sites you open and the content you share are lawful and respect copyright. When you use YouTube, Spotify and other services, their own terms also apply (playing together on Spotify may require Spotify Premium).</p>
<p>If you are a rights holder and believe your rights are being infringed through the Service, write to ${mail} and we will take the necessary steps.</p>
<h4>6. Status of the Service</h4>
<p>Get Love Room is free and still being developed. We provide the Service "as is" and don't guarantee it will run uninterrupted or error-free. We may change, add or remove features. Audio/video quality depends on your internet connection.</p>
<h4>7. Limitation of liability</h4>
<p>To the extent permitted by law, we are not liable for indirect damages, data loss, third-party services, or content shared by users. We recommend keeping a copy of important memories on your device (Album → Save to gallery).</p>
<h4>8. Termination</h4>
<p>You can delete your account and home at any time via Menu → <i>Delete my data</i>. We may close accounts that seriously breach these terms.</p>
<h4>9. Changes</h4>
<p>If we update these terms we will change the date, and for significant changes we will ask for your consent again the next time you sign in.</p>
<h4>10. Governing law</h4>
<p>These terms are governed by the laws of the Republic of Türkiye. Your mandatory consumer rights under the law of the country where you live remain unaffected.</p>`,
  },
  {
    id: 'gizlilik',
    title: 'Gizlilik Politikası',
    html: `
<p class="muted">Last updated: ${DATE}</p>
<p>In short: we keep only the data needed to run your home, we never sell it, we use no ads or trackers, and we delete it whenever you ask.</p>
<h4>Data we collect</h4>
<ul>
  <li><b>Account:</b> if you sign in with Google, the name and email address Google gives us (kept in Firebase Authentication). For guest sign-in, only the name you type.</li>
  <li><b>Profile:</b> your display name, your character's look, your sun/moon choice, your time zone (to show two different skies) and your language.</li>
  <li><b>Your home's content:</b> your position in the home and which room you're in, furniture and decor choices, photos you hang in frames or add to the album, photo booth shots, drawings, diary entries and letters, question jar answers, relationship dates, game scores, cat and flower status, badge counters, links opened on the TV and playback position, and info about the song you're listening to together.</li>
  <li><b>Voice/video chat and sharing:</b> microphone, camera and screen/video sharing flow directly and encrypted between your two devices (WebRTC). <b>We don't record or store them.</b> On some networks the connection passes through a relay server (Metered TURN) that cannot see the content.</li>
  <li><b>Spotify:</b> if you connect Spotify, the access token is stored only on your device. So your partner can see them, the names and cover images of your public/collaborative playlists are written to your home.</li>
</ul>
<h4>Why we use it</h4>
<p>Only to provide the Service: bringing you and your partner together in one home, showing your partner what you share, syncing movies and music, security and preventing abuse. Never for marketing, profiling or ads.</p>
<h4>Who it's shared with</h4>
<ul>
  <li><b>Your partner:</b> sees everything you add to the home. The diary and jar answers are shared between you.</li>
  <li><b>Service providers</b> working on our behalf: Google Firebase (authentication and database; European Union, Belgium region), GitHub Pages (website hosting), Metered (connection relay).</li>
  <li><b>Services you open:</b> when you open YouTube or another site on the TV, or connect Spotify, those services process data under their own privacy policies (e.g. YouTube cookies).</li>
  <li>Competent authorities, when required by law.</li>
</ul>
<h4>Retention and deletion</h4>
<p>Your data is kept until you delete it. You can delete each photo, entry or answer individually. When you choose Menu → <i>Delete my data</i>, your account, profile and <b>shared home (including content your partner added)</b> are removed from the database immediately. If your partner wants to keep their content, ask them to save it from the Album first.</p>
<h4>Security</h4>
<p>Connections are encrypted with HTTPS; database rules ensure that only the two owners of a home can access it. Chat streams are end-to-end encrypted. Still, no system is 100% secure; share your invite link only with your partner.</p>
<h4>Children</h4>
<p>The Service is not for people under 18; we don't knowingly collect data from anyone under 18.</p>
<h4>Your rights</h4>
<p>You can ask to access, correct or delete your data, or object to its processing, by writing to ${mail}. If you live in the EU/EEA or the UK, you also have rights under the GDPR, including data portability and the right to complain to your local data protection authority. Users in Türkiye can find details in the KVKK Notice.</p>`,
  },
  {
    id: 'kvkk',
    title: 'KVKK Aydınlatma Metni',
    html: `
<p class="muted">Notice under Turkish Personal Data Protection Law No. 6698 ("KVKK"), Article 10 · ${DATE}</p>
<h4>Data controller</h4>
<p>${COMPANY} · Contact: ${mail}</p>
<h4>Personal data processed</h4>
<p>Identity (name), contact (email when signing in with Google), visual records (photos you upload, booth shots), user content (diary, letters, drawings, answers), usage data other than location (room/position in the home, game and care records, time zone), transaction security data (user ID). Voice and video are <b>not recorded</b>; they are only transmitted live between the two devices.</p>
<h4>Purposes and legal grounds</h4>
<ul>
  <li>Creating your membership and providing the Service: <i>establishment and performance of a contract</i> (KVKK Art. 5/2-c),</li>
  <li>Securing the Service and preventing abuse: <i>legitimate interest</i> (Art. 5/2-f),</li>
  <li>Meeting legal obligations: <i>legal obligation</i> (Art. 5/2-ç),</li>
  <li>Storing data on servers abroad: <i>your explicit consent</i> (Art. 9/1).</li>
</ul>
<h4>How it's collected</h4>
<p>Data is collected electronically and automatically from what you enter and share while using the app, and from Google when you sign in with Google.</p>
<h4>Transfers</h4>
<p>Data may be transferred to Google LLC for hosting and database services (Firebase, European Union – Belgium servers), to Metered for connection relaying, to GitHub for publishing the website (abroad), and to legally authorised bodies. Transfers abroad rely on the explicit consent you gave at sign-in. You can withdraw your consent at any time; since the Service can't work without it, your data will then be deleted.</p>
<h4>Your rights (KVKK Art. 11)</h4>
<p>You have the right to learn whether your data is processed, request information, learn whether it is used for its purpose, know who it is transferred to, request correction of incomplete or incorrect data, request deletion or destruction, request that these actions be notified to recipients, object to results against you arising from automated analysis, and claim compensation for damage caused by unlawful processing.</p>
<p>Send your requests to ${mail}; they will be answered free of charge within 30 days at the latest. If you are not satisfied with the answer, you can complain to the Personal Data Protection Board.</p>`,
  },
  {
    id: 'cerez',
    title: 'Çerezler ve Yerel Depolama',
    html: `
<p>Get Love Room doesn't use advertising or tracking cookies. We store only what's needed to work in your browser:</p>
<ul>
  <li><b>Session:</b> Firebase sign-in info (so you don't have to sign in again).</li>
  <li><b>Preferences:</b> language, view (close-up/whole room), rooms visited, recently opened TV links.</li>
  <li><b>Spotify:</b> if you connect it, the access token (only on this device).</li>
</ul>
<p>When you open YouTube or another site on the TV, that site may use its own cookies. The font is loaded from Google Fonts. You can clear all of this by deleting site data in your browser settings (with a guest sign-in you may not get back into your home).</p>`,
  },
];
