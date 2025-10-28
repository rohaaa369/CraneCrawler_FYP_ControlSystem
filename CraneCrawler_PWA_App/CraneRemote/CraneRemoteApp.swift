
import SwiftUI

@main
struct CraneRemoteApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .onAppear {
                    // Keep the screen awake while the app is active
                    UIApplication.shared.isIdleTimerDisabled = true
                }
                .onDisappear {
                    // Re-enable the idle timer when the app is closed
                    UIApplication.shared.isIdleTimerDisabled = false
                }
        }
    }
}
