# Tripic App Review Response

Replace the bracketed video link before sending this response in App Store Connect and copy the same information to App Review Information > Notes.

## Reply to App Review

Hello App Review Team,

Thank you for your guidance. We updated Tripic and completed physical-device QA for the submitted build.

1. **Physical-device screen recording**

   [PUBLIC OR ATTACHED VIDEO LINK]

   The recording begins with a fresh launch and demonstrates guest access, Sign in with Apple, account deletion, photo selection, tourist-place confirmation, travel-record creation, the updated travel map, record editing, and local-record deletion.

   Tripic also offers Kakao login. No Tripic password is created. Reviewers can access every travel-recording feature by selecting “로그인 없이 둘러보기” (Continue without login). Sign in with Apple can be tested with the reviewer’s Apple ID. An authenticated user can delete the account in Settings > Account > Delete Account.

   The app does not publish user-generated content or provide social sharing, so reporting and blocking mechanisms are not applicable.

2. **Purpose and target audience**

   Tripic is a personal travel-recording app for people who want to turn their own travel photos into a visual record of places visited in South Korea. It helps users identify a tourist place from photo metadata or manual search, save a private travel note on the device, and visualize visited regions on an interactive map.

3. **Access and setup instructions**

   No subscription, payment, demo account, or sample file is required.

   - Launch the app and choose Sign in with Apple, Kakao login, or “로그인 없이 둘러보기” for guest access.
   - Tap “사진으로 기록 시작” to select one or more photos from the device photo library.
   - Review the photo date and choose nearby-place lookup when GPS metadata is available, or search manually.
   - Confirm a tourist place, enter an optional title, memo, and hashtags, and save.
   - The saved record appears in the recent-record list and updates the visited-region map.
   - Open Settings to review privacy information, manage local records, log out, or delete the account.

4. **External services, tools, and platforms**

   - Sign in with Apple: optional account authentication.
   - Kakao Login: optional account authentication.
   - Korea Tourism Organization TourAPI: returns tourist-place search results and details. If the user explicitly chooses nearby search for a photo containing GPS metadata, coordinates and a search radius are sent directly to TourAPI. Photo files are never sent.
   - Tripic API (`https://tripic.remin.dev`): exchanges social-login credentials, maintains the account session, supports account deletion, and provides app-version, notice, and policy information. It does not receive travel records, photos, or photo GPS coordinates.
   - Apple Photos picker: lets the user select photos. Tripic only accesses photos selected by the user.
   - Statistics Korea SGIS administrative-boundary data, transformed from the `vuski/admdongkor` dataset: bundled map geometry used to display South Korean regions. Attribution is shown in the app.

   Tripic does not use payment, advertising, analytics, tracking, or AI services.

5. **Regional differences**

   The app has no region lock and functions consistently in all App Store regions. The current interface and tourism content are in Korean and focus on destinations within South Korea. Internet access is required for social login and live tourist-place search.

6. **Regulated industry and third-party material**

   Tripic is not a medical, financial, gambling, transportation, or other highly regulated service. Tourist information is provided through the Korea Tourism Organization public TourAPI. Bundled administrative-boundary geometry is derived from Statistics Korea SGIS data and the `vuski/admdongkor` project under their stated public-data and CC BY 4.0 terms. Attribution and source links are shown in the app.

Please let us know if any additional information is required.

Best regards,

Sihyun Park

## Physical-device recording checklist

Record one continuous video on an iPhone running the latest available iOS version:

1. Show the iOS Home Screen and launch Tripic.
2. Show the three entry choices: Apple, Kakao, and guest.
3. Complete Sign in with Apple and show the travel map.
4. Open Settings and show the logged-in provider and Delete Account control.
5. Delete the test account, then choose guest access.
6. Select a non-sensitive sample travel photo and show the photo-information screen.
7. Show either GPS consent and nearby candidates or manual place search.
8. Confirm a place, add an optional title/memo/hashtag, and save.
9. Show the updated map and open/edit the saved record.
10. Open Settings and show privacy documents and local-record deletion controls.

Before recording, disable notifications and avoid showing personal photos, Apple ID details, location history, or other private information.

## App Privacy review points

Confirm these answers against the deployed server and third-party retention policies before publishing:

- **User ID**: collected for optional Apple or Kakao accounts; used for App Functionality; linked to the user; not used for tracking.
- **Other User Content**: a nickname is sent to Tripic when an authenticated user sets one. Travel titles, memos, hashtags, and photos remain on the device.
- **Photos or Videos**: not collected by Tripic; selected originals and EXIF-stripped copies stay on the device.
- **Precise Location**: sent only to TourAPI after explicit nearby-search consent; used for App Functionality; not linked by Tripic; not used for tracking.
- **Search History**: assess conservatively until TourAPI confirms whether search terms and content IDs are retained.
- **Diagnostics or Other Data**: disclose only if the deployed Tripic API retains IP address, device/app version, crash, or request logs beyond servicing the request.
- **Tracking**: no advertising, cross-app tracking, or advertising-identifier use.
