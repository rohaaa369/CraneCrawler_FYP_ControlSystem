// This file is not used in PWA mode, but kept for reference.
// To use Capacitor, you would install the dependencies and uncomment the relevant code.

// import type { CapacitorConfig } from '@capacitor/cli';

// const config: CapacitorConfig = {
//   appId: 'com.crane.remote',
//   appName: 'Crane Remote',
//   webDir: 'out',
//   server: {
//     hostname: 'crane.local',
//     androidScheme: 'https',
//     allowNavigation: ['192.168.100.*'],
//   },
//   ios: {
//     scheme: 'CraneRemote',
//     contentInset: 'never',
//     allowsLinkPreview: false,
//     infoPlist: {
//       NSLocalNetworkUsageDescription: 'This app connects to a crane controller on the local network.',
//       NSBonjourServices: ['_http._tcp', '_ws._tcp'],
//       NSAppTransportSecurity: {
//         NSAllowsArbitraryLoads: true, 
//         NSExceptionDomains: {
//           '192.168.100.10': {
//             NSIncludesSubdomains: false,
//             NSExceptionAllowsInsecureHTTPLoads: true,
//           },
//           'crane.local': { 
//              NSIncludesSubdomains: true,
//              NSExceptionAllowsInsecureHTTPLoads: true,
//           }
//         },
//       },
//     },
//   },
//   plugins: {
//     App: {
//       exitOnClose: false,
//     },
//     Screen: {
//       keepAwake: true,
//     },
//   },
// };

// export default config;

export default {}; // Empty export to avoid errors
