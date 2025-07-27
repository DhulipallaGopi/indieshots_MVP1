import React from 'react';
import './classy-shot-animation.css';

/**
 * Classy Shot Generation Animation
 * Features elegant film elements with golden accents and smooth transitions
 */
export const ClassyShotAnimation: React.FC<{ message?: string }> = ({ 
  message = "Crafting cinematic shots..." 
}) => {
  return (
    <div className="classy-shot-container">
      {/* Background with subtle pattern */}
      <div className="classy-background">
        <div className="background-pattern"></div>
      </div>
      
      {/* Main Animation Area */}
      <div className="classy-animation-area">
        
        {/* Central Film Strip Animation */}
        <div className="film-strip-center">
          <div className="film-strip-wrapper">
            <div className="film-strip">
              <div className="film-frame frame1">
                <div className="frame-content">
                  <div className="camera-icon">📹</div>
                </div>
              </div>
              <div className="film-frame frame2">
                <div className="frame-content">
                  <div className="lens-icon">🎥</div>
                </div>
              </div>
              <div className="film-frame frame3">
                <div className="frame-content">
                  <div className="scene-icon">🎬</div>
                </div>
              </div>
              <div className="film-frame frame4">
                <div className="frame-content">
                  <div className="film-icon">🎞️</div>
                </div>
              </div>
            </div>
            <div className="film-perforations left">
              <div className="perforation"></div>
              <div className="perforation"></div>
              <div className="perforation"></div>
              <div className="perforation"></div>
              <div className="perforation"></div>
              <div className="perforation"></div>
            </div>
            <div className="film-perforations right">
              <div className="perforation"></div>
              <div className="perforation"></div>
              <div className="perforation"></div>
              <div className="perforation"></div>
              <div className="perforation"></div>
              <div className="perforation"></div>
            </div>
          </div>
        </div>
        
        {/* Orbiting Elements */}
        <div className="orbiting-elements">
          <div className="orbit-ring ring1">
            <div className="orbit-element element1">
              <div className="golden-dot"></div>
            </div>
            <div className="orbit-element element2">
              <div className="golden-dot"></div>
            </div>
            <div className="orbit-element element3">
              <div className="golden-dot"></div>
            </div>
          </div>
          
          <div className="orbit-ring ring2">
            <div className="orbit-element element4">
              <div className="golden-square"></div>
            </div>
            <div className="orbit-element element5">
              <div className="golden-square"></div>
            </div>
          </div>
          
          <div className="orbit-ring ring3">
            <div className="orbit-element element6">
              <div className="golden-triangle"></div>
            </div>
          </div>
        </div>
        
        {/* Floating Sparkles */}
        <div className="sparkles">
          <div className="sparkle sparkle1">✨</div>
          <div className="sparkle sparkle2">✨</div>
          <div className="sparkle sparkle3">✨</div>
          <div className="sparkle sparkle4">✨</div>
          <div className="sparkle sparkle5">✨</div>
          <div className="sparkle sparkle6">✨</div>
        </div>
        
        {/* Elegant Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill"></div>
            <div className="progress-glow"></div>
          </div>
        </div>
      </div>
      
      {/* Classy Loading Text */}
      <div className="classy-loading-text">
        <h3 className="loading-title">IndieShots</h3>
        <p className="loading-message">{message}</p>
        <div className="loading-dots-elegant">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
};

/**
 * Luxury Storyboard Animation
 * Features premium visual elements for shot generation
 */
export const LuxuryStoryboardAnimation: React.FC<{ message?: string }> = ({ 
  message = "Creating visual masterpiece..." 
}) => {
  return (
    <div className="luxury-storyboard-container">
      <div className="luxury-background">
        <div className="luxury-pattern"></div>
      </div>
      
      {/* Storyboard Frame Animation */}
      <div className="storyboard-frames">
        <div className="frame-stack">
          <div className="storyboard-frame frame-1">
            <div className="frame-border"></div>
            <div className="frame-content">
              <div className="sketch-lines">
                <div className="line line1"></div>
                <div className="line line2"></div>
                <div className="line line3"></div>
              </div>
            </div>
          </div>
          
          <div className="storyboard-frame frame-2">
            <div className="frame-border"></div>
            <div className="frame-content">
              <div className="sketch-circle"></div>
            </div>
          </div>
          
          <div className="storyboard-frame frame-3">
            <div className="frame-border"></div>
            <div className="frame-content">
              <div className="sketch-triangle"></div>
            </div>
          </div>
        </div>
        
        {/* Golden Pen Animation */}
        <div className="golden-pen">
          <div className="pen-body"></div>
          <div className="pen-tip"></div>
          <div className="pen-trail"></div>
        </div>
      </div>
      
      {/* Luxury Text */}
      <div className="luxury-text">
        <h3 className="luxury-title">Creating Storyboard</h3>
        <p className="luxury-message">{message}</p>
        <div className="luxury-progress">
          <div className="luxury-progress-bar">
            <div className="luxury-progress-fill"></div>
          </div>
        </div>
      </div>
    </div>
  );
};