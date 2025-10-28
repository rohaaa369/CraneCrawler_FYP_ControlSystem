
import SwiftUI
import WebKit

struct WebView: UIViewRepresentable {
    let url: URL
    @ObservedObject var appState: AppState
    var onLoadError: () -> Void
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self, appState: appState)
    }

    func makeUIView(context: Context) -> WKWebView {
        let prefs = WKWebpagePreferences()
        prefs.allowsContentJavaScript = true
        
        let config = WKWebViewConfiguration()
        config.defaultWebpagePreferences = prefs
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false
        
        let refreshControl = UIRefreshControl()
        refreshControl.addTarget(context.coordinator, action: #selector(Coordinator.handleRefresh), for: .valueChanged)
        webView.scrollView.addSubview(refreshControl)
        
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        if appState.needsRefresh {
             uiView.load(URLRequest(url: url))
             DispatchQueue.main.async {
                 appState.needsRefresh = false
             }
         }
    }

    class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        var parent: WebView
        var appState: AppState
        var statusTimer: Timer?

        init(_ parent: WebView, appState: AppState) {
            self.parent = parent
            self.appState = appState
        }
        
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            // Start a timer to periodically check connection status
            statusTimer?.invalidate()
            statusTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { [weak webView] _ in
                webView?.evaluateJavaScript("window.appOnline") { (result, error) in
                    if let isOnline = result as? Bool {
                        self.appState.connectionStatus = isOnline ? .online : .offline
                    } else {
                        self.appState.connectionStatus = .unknown
                    }
                }
            }
        }
        
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            print("Webview failed to load: \(error.localizedDescription)")
            parent.onLoadError()
            statusTimer?.invalidate()
            appState.connectionStatus = .offline
        }

        // Handle external links and popups
        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            // Block popups
            return nil
        }
        
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            // Allow navigation only within the host of the initial URL
            if let targetUrl = navigationAction.request.url, let initialHost = parent.url.host {
                if targetUrl.host == initialHost {
                    decisionHandler(.allow)
                    return
                }
            }
            // Block all other navigation
            decisionHandler(.cancel)
        }
        
        @objc func handleRefresh(_ sender: UIRefreshControl) {
            sender.superview?.isUserInteractionEnabled = false // Prevent interaction during reload
            if let webView = sender.superview as? WKWebView {
                webView.reload()
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                sender.endRefreshing()
                 sender.superview?.isUserInteractionEnabled = true
            }
        }
    }
}
