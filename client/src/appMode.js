// Which app this build is. The Android build makes two separate apps from one code base:
//   'admin'   -> "School Admin": opens on the administrator sign-in only
//   'teacher' -> "School Teacher": opens on the teacher sign-in only
// The website (and any plain build) is 'web': it shows the "Who's signing in?" chooser.
export const APP_MODE = import.meta.env.VITE_APP_MODE || 'web';
