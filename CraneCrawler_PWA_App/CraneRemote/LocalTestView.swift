
import SwiftUI
import WebKit

struct LocalTestView: UIViewRepresentable {
    let wsUrl: URL

    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView()
        
        guard let path = Bundle.main.path(forResource: "LocalTest", ofType: "html") else {
            webView.loadHTMLString("<h1>Error: LocalTest.html not found</h1>", baseURL: nil)
            return webView
        }
        
        do {
            var htmlString = try String(contentsOfFile: path, encoding: .utf8)
            // Inject the WebSocket URL into the HTML
            htmlString = htmlString.replacingOccurrences(of: "%%WEBSOCKET_URL%%", with: wsUrl.absoluteString)
            webView.loadHTMLString(htmlString, baseURL: Bundle.main.bundleURL)
        } catch {
             webView.loadHTMLString("<h1>Error: Could not load LocalTest.html</h1><p>\(error.localizedDescription)</p>", baseURL: nil)
        }
        
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
