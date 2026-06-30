import AppKit
import AVFoundation
import CoreVideo
import Foundation

struct EncoderError: Error, CustomStringConvertible {
    let description: String
}

func arg(_ index: Int, _ fallback: String? = nil) throws -> String {
    if CommandLine.arguments.count > index {
        return CommandLine.arguments[index]
    }
    if let fallback {
        return fallback
    }
    throw EncoderError(description: "Missing argument \(index)")
}

let framesDir = URL(fileURLWithPath: try arg(1))
let outputUrl = URL(fileURLWithPath: try arg(2))
let fps = Int32(try arg(3, "12")) ?? 12
let width = Int(try arg(4, "1280")) ?? 1280
let height = Int(try arg(5, "720")) ?? 720

let fileManager = FileManager.default
if fileManager.fileExists(atPath: outputUrl.path) {
    try fileManager.removeItem(at: outputUrl)
}

let frameUrls = try fileManager.contentsOfDirectory(
    at: framesDir,
    includingPropertiesForKeys: nil
).filter { $0.pathExtension.lowercased() == "png" }
    .sorted { $0.lastPathComponent < $1.lastPathComponent }

if frameUrls.isEmpty {
    throw EncoderError(description: "No PNG frames found in \(framesDir.path)")
}

let writer = try AVAssetWriter(outputURL: outputUrl, fileType: .mp4)
let settings: [String: Any] = [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: width,
    AVVideoHeightKey: height,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: 7_000_000,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
    ],
]

let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
input.expectsMediaDataInRealTime = false

let attrs: [String: Any] = [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB,
    kCVPixelBufferWidthKey as String: width,
    kCVPixelBufferHeightKey as String: height,
]

let adaptor = AVAssetWriterInputPixelBufferAdaptor(
    assetWriterInput: input,
    sourcePixelBufferAttributes: attrs
)

if !writer.canAdd(input) {
    throw EncoderError(description: "Cannot add AVAssetWriterInput")
}
writer.add(input)

if !writer.startWriting() {
    throw writer.error ?? EncoderError(description: "Unable to start writer")
}
writer.startSession(atSourceTime: .zero)

func makePixelBuffer(from imageUrl: URL) throws -> CVPixelBuffer {
    var pixelBuffer: CVPixelBuffer?
    let status = CVPixelBufferCreate(
        kCFAllocatorDefault,
        width,
        height,
        kCVPixelFormatType_32ARGB,
        attrs as CFDictionary,
        &pixelBuffer
    )

    guard status == kCVReturnSuccess, let buffer = pixelBuffer else {
        throw EncoderError(description: "Unable to create pixel buffer")
    }

    guard let nsImage = NSImage(contentsOf: imageUrl) else {
        throw EncoderError(description: "Unable to load \(imageUrl.path)")
    }

    CVPixelBufferLockBaseAddress(buffer, [])
    defer { CVPixelBufferUnlockBaseAddress(buffer, []) }

    guard let context = CGContext(
        data: CVPixelBufferGetBaseAddress(buffer),
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue
    ) else {
        throw EncoderError(description: "Unable to create CGContext")
    }

    context.clear(CGRect(x: 0, y: 0, width: width, height: height))
    let rect = CGRect(x: 0, y: 0, width: width, height: height)

    guard let cgImage = nsImage.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
        throw EncoderError(description: "Unable to create CGImage")
    }

    context.draw(cgImage, in: rect)
    return buffer
}

for (index, frameUrl) in frameUrls.enumerated() {
    while !input.isReadyForMoreMediaData {
        Thread.sleep(forTimeInterval: 0.01)
    }

    let buffer = try makePixelBuffer(from: frameUrl)
    let time = CMTime(value: CMTimeValue(index), timescale: fps)

    if !adaptor.append(buffer, withPresentationTime: time) {
        throw writer.error ?? EncoderError(description: "Failed to append frame \(index)")
    }

    if index % 100 == 0 {
        print("encoded \(index)/\(frameUrls.count)")
    }
}

input.markAsFinished()
writer.finishWriting {
    if writer.status == .failed {
        print("failed: \(writer.error?.localizedDescription ?? "unknown")")
        exit(1)
    }
    print("rendered \(outputUrl.path)")
}

RunLoop.current.run(until: Date(timeIntervalSinceNow: 2))
