
import SwiftUI
import Combine

struct AppSettings: Codable {
    var startUrlString: String
    var wsUrlString: String
    
    var startUrl: URL {
        URL(string: startUrlString) ?? URL(string: "http://192.168.100.11")!
    }
    
    var wsUrl: URL {
        URL(string: wsUrlString) ?? URL(string: "ws://192.168.100.10:8080/ws")!
    }
    
    static let defaultSettings = AppSettings(
        startUrlString: "http://192.168.100.11",
        wsUrlString: "ws://192.168.100.10:8080/ws"
    )
}

class AppState: ObservableObject {
    @Published var settings: AppSettings {
        didSet {
            saveSettings()
            needsRefresh = true
        }
    }
    @Published var needsRefresh: Bool = true
    @Published var connectionStatus: ConnectionStatus = .unknown
    
    private let settingsKey = "craneAppSettings"
    
    init() {
        self.settings = Self.loadSettings()
    }

    private static func loadSettings() -> AppSettings {
        if let data = UserDefaults.standard.data(forKey: "craneAppSettings"),
           let decodedSettings = try? JSONDecoder().decode(AppSettings.self, from: data) {
            return decodedSettings
        }
        return AppSettings.defaultSettings
    }

    private func saveSettings() {
        if let encoded = try? JSONEncoder().encode(settings) {
            UserDefaults.standard.set(encoded, forKey: settingsKey)
        }
    }
    
    func refreshWebView() {
        needsRefresh = true
    }
}

enum ConnectionStatus: String {
    case online = "Online"
    case offline = "Offline"
    case unknown = "Unknown"
}


struct SettingsView: View {
    @Binding var settings: AppSettings
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Connection"), footer: Text("Enter the full URL for the web interface and WebSocket server.")) {
                    HStack {
                        Text("Start URL")
                        TextField("http://...", text: $settings.startUrlString)
                            .keyboardType(.URL)
                            .autocapitalization(.none)
                            .multilineTextAlignment(.trailing)
                    }
                    HStack {
                        Text("WebSocket URL")
                        TextField("ws://...", text: $settings.wsUrlString)
                             .keyboardType(.URL)
                             .autocapitalization(.none)
                             .multilineTextAlignment(.trailing)
                    }
                }
            }
            .navigationTitle("Settings")
            .navigationBarItems(trailing: Button("Done") {
                dismiss()
            })
        }
    }
}
