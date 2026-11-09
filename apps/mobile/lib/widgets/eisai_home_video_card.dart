import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

class EisaiHomeVideoCard extends StatefulWidget {
  const EisaiHomeVideoCard({
    super.key,
    required this.assetPath,
    required this.active,
    required this.semanticLabel,
  });

  final String assetPath;
  final bool active;
  final String semanticLabel;

  @override
  State<EisaiHomeVideoCard> createState() => _EisaiHomeVideoCardState();
}

class _EisaiHomeVideoCardState extends State<EisaiHomeVideoCard> {
  late final VideoPlayerController _controller;
  bool _ready = false;
  bool _failed = false;
  bool _userPaused = false;

  @override
  void initState() {
    super.initState();
    _controller = VideoPlayerController.asset(widget.assetPath);
    _controller.addListener(_onPlayerChanged);
    _initialize();
  }

  Future<void> _initialize() async {
    try {
      await _controller.initialize();
      await _controller.setLooping(true);
      await _controller.setVolume(0);
      if (!mounted) return;
      setState(() => _ready = true);
      await _syncPlayback();
    } catch (_) {
      if (mounted) setState(() => _failed = true);
    }
  }

  void _onPlayerChanged() {
    if (_controller.value.hasError && !_failed && mounted) {
      setState(() => _failed = true);
    }
  }

  Future<void> _syncPlayback() async {
    if (!_ready || _failed) return;
    try {
      if (widget.active && !_userPaused) {
        await _controller.play();
      } else {
        await _controller.pause();
      }
    } catch (_) {
      if (mounted) setState(() => _failed = true);
    }
  }

  @override
  void didUpdateWidget(covariant EisaiHomeVideoCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.active != widget.active) {
      // Returning to a card resumes playback unless the user paused it.
      _syncPlayback();
    }
  }

  void _togglePlayback() {
    if (!_ready || _failed) return;
    setState(() => _userPaused = !_userPaused);
    _syncPlayback();
  }

  @override
  void dispose() {
    _controller.removeListener(_onPlayerChanged);
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_failed) {
      return const ColoredBox(
        color: Color(0xFF1A1A1A),
        child: Center(
          child: Icon(Icons.videocam_off_outlined, color: Colors.white70),
        ),
      );
    }

    if (!_ready) {
      return const ColoredBox(
        color: Color(0xFF1A1A1A),
        child: Center(child: CircularProgressIndicator(color: Colors.white)),
      );
    }

    return Semantics(
      label: widget.semanticLabel,
      button: true,
      hint: _controller.value.isPlaying ? 'Pause video' : 'Play video',
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: _togglePlayback,
        child: Stack(
          fit: StackFit.expand,
          children: [
            ClipRect(
              child: FittedBox(
                fit: BoxFit.cover,
                child: SizedBox(
                  width: _controller.value.size.width,
                  height: _controller.value.size.height,
                  child: VideoPlayer(_controller),
                ),
              ),
            ),
            if (_userPaused || !widget.active)
              const Center(
                child: Icon(
                  Icons.play_circle_outline,
                  color: Colors.white,
                  size: 52,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
