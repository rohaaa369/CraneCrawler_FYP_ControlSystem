
import SwiftUI

struct ContentView: View {
    @EnvironmentObject var appState: AppState
    @State private var isShowingSettings = false
    @State private var isShowingLocalTest = false
    @State private var showErrorView = false

    var body: some View {
        ZStack {
            if showErrorView {
                ErrorView(
                    retryAction: {
                        showErrorView = false
                        appState.refreshWebView()
                    },
                    settingsAction: { isShowingSettings = true },
                    localTestAction: { isShowingLocalTest = true }
                )
            } else {
                WebView(
                    url: appState.settings.startUrl,
                    appState: appState,
                    onLoadError: {
                        showErrorView = true
                    }
                )
                .edgesIgnoringSafeArea(.all)
            }

            // Floating Buttons
            VStack {
                Spacer()
                HStack {
                    ConnectionStatusView()
                    Spacer()
                    Button(action: { isShowingSettings = true }) {
                        Image(systemName: "gearshape.fill")
                            .font(.system(size: 24))
                            .foregroundColor(.white)
                            .padding()
                            .background(Color.black.opacity(0.6))
                            .clipShape(Circle())
                    }
                }
                .padding()
            }
        }
        .sheet(isPresented: $isShowingSettings) {
            SettingsView(settings: $appState.settings)
        }
        .sheet(isPresented: $isShowingLocalTest) {
            LocalTestView(wsUrl: appState.settings.wsUrl)
        }
    }
}

struct ErrorView: View {
    var retryAction: () -> Void
    var settingsAction: () -> Void
    var localTestAction: () -> Void
    @EnvironmentObject var appState: AppState

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 80))
                .foregroundColor(.red)
            
            Text("Connection Failed")
                .font(.largeTitle)
                .fontWeight(.bold)
            
            Text("No local server found at:")
                .font(.title2)
                .foregroundColor(.secondary)
            
            Text(appState.settings.startUrl.absoluteString)
                .font(.title3)
                .fontWeight(.semibold)
                .padding(.horizontal)
                .multilineTextAlignment(.center)
            
            HStack(spacing: 20) {
                Button("Retry", action: retryAction)
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                
                Button("Settings", action: settingsAction)
                    .buttonStyle(.bordered)
                    .controlSize(.large)
            }
            .padding(.top)
            
            Button("Run Local Test Utility", action: localTestAction)
                .padding(.top)
        }
        .padding()
    }
}

struct ConnectionStatusView: View {
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        HStack {
            Circle()
                .frame(width: 15, height: 15)
                .foregroundColor(statusColor)
            Text(appState.connectionStatus.rawValue.uppercased())
                .font(.headline)
                .foregroundColor(.white)
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .background(Color.black.opacity(0.6))
        .cornerRadius(20)
    }
    
    var statusColor: Color {
        switch appState.connectionStatus {
        case .online:
            return .green
        case .offline:
            return .red
        case .unknown:
            return .gray
        }
    }
}
