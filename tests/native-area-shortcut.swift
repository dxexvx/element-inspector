import AppKit
import CoreGraphics

guard CommandLine.arguments.count == 2,
      let pid = Int32(CommandLine.arguments[1]),
      let app = NSRunningApplication(processIdentifier: pid),
      let executable = app.executableURL?.lastPathComponent,
      executable == "Chromium" || executable == "Google Chrome for Testing" else {
  FileHandle.standardError.write(Data("Isolated Chromium process required.\n".utf8))
  exit(1)
}
_ = app.activate(options: [])
Thread.sleep(forTimeInterval: 0.15)
for down in [true, false] {
  guard let event = CGEvent(keyboardEventSource: nil, virtualKey: 13, keyDown: down) else { exit(1) }
  event.flags = [.maskAlternate, .maskShift]
  event.postToPid(pid)
  Thread.sleep(forTimeInterval: 0.04)
}
