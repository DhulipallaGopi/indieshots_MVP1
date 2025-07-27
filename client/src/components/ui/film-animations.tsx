import React from 'react';
import './film-animations.css';

/**
 * Cinematic Loading Screen Component
 * Features a movie clapperboard that opens and closes repeatedly
 */
export const ClapperboardLoading: React.FC<{ message?: string }> = ({ 
  message = "Scene Loading..." 
}) => {
  return (
    <div className="film-loading-container">
      <div className="clapperboard-wrapper">
        {/* Clapperboard Base */}
        <div className="clapperboard-base">
          <div className="clapperboard-stripes">
            <div className="stripe black"></div>
            <div className="stripe white"></div>
            <div className="stripe black"></div>
            <div className="stripe white"></div>
            <div className="stripe black"></div>
            <div className="stripe white"></div>
          </div>
          
          {/* Film Info Text */}
          <div className="film-info">
            <div className="film-title">INDIESHOTS</div>
            <div className="film-details">
              <span>SCENE: 01</span>
              <span>TAKE: 01</span>
            </div>
          </div>
        </div>
        
        {/* Clapperboard Top (Animated) */}
        <div className="clapperboard-top">
          <div className="clapperboard-stripes">
            <div className="stripe black"></div>
            <div className="stripe white"></div>
            <div className="stripe black"></div>
            <div className="stripe white"></div>
            <div className="stripe black"></div>
            <div className="stripe white"></div>
          </div>
        </div>
        
        {/* Hinge */}
        <div className="clapperboard-hinge"></div>
      </div>
      
      {/* Loading Text */}
      <div className="loading-text">
        <span className="loading-message">{message}</span>
        <div className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
};

/**
 * Authentication Failure Animation
 * Features a security guard with access denied sign
 */
export const AccessDeniedAnimation: React.FC<{ message?: string }> = ({ 
  message = "Access Denied. You're not on the guest list." 
}) => {
  return (
    <div className="film-error-container">
      <div className="security-guard">
        {/* Guard Figure */}
        <div className="guard-body">
          <div className="guard-head">
            <div className="guard-face">
              <div className="guard-eyes">
                <div className="eye left"></div>
                <div className="eye right"></div>
              </div>
              <div className="guard-mouth"></div>
            </div>
            <div className="guard-hat"></div>
          </div>
          <div className="guard-torso">
            <div className="guard-badge">🛡️</div>
          </div>
          <div className="guard-arms">
            <div className="arm left"></div>
            <div className="arm right"></div>
          </div>
        </div>
        
        {/* Access Denied Sign */}
        <div className="access-denied-sign">
          <div className="sign-post"></div>
          <div className="sign-board">
            <div className="sign-text">
              <span className="denied-icon">🚫</span>
              <span className="denied-text">ACCESS<br/>DENIED</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="error-message">
        <span>{message}</span>
      </div>
    </div>
  );
};

/**
 * Server Error Animation
 * Features an old film projector with "NO SIGNAL" screen
 */
export const ProjectorErrorAnimation: React.FC<{ message?: string }> = ({ 
  message = "Projector Jammed! Please try again later." 
}) => {
  return (
    <div className="film-error-container">
      <div className="projector-setup">
        {/* Film Projector */}
        <div className="projector">
          <div className="projector-body">
            <div className="projector-lens"></div>
            <div className="projector-reel left-reel">
              <div className="reel-center"></div>
              <div className="film-strip"></div>
            </div>
            <div className="projector-reel right-reel">
              <div className="reel-center"></div>
              <div className="film-strip"></div>
            </div>
          </div>
        </div>
        
        {/* Projection Screen */}
        <div className="projection-screen">
          <div className="screen-content">
            <div className="no-signal-text">
              <span className="signal-icon">📺</span>
              <span className="signal-text">NO SIGNAL</span>
            </div>
            <div className="static-lines"></div>
          </div>
        </div>
      </div>
      
      <div className="error-message">
        <span>{message}</span>
      </div>
    </div>
  );
};

/**
 * Network Lag Animation
 * Features a spinning film reel with bouncing popcorn
 */
export const BufferingAnimation: React.FC<{ message?: string }> = ({ 
  message = "Catching up… the scene is buffering." 
}) => {
  return (
    <div className="film-loading-container">
      <div className="buffering-setup">
        {/* Film Reel */}
        <div className="film-reel">
          <div className="reel-outer">
            <div className="reel-inner">
              <div className="reel-center"></div>
              <div className="reel-holes">
                <div className="hole"></div>
                <div className="hole"></div>
                <div className="hole"></div>
                <div className="hole"></div>
                <div className="hole"></div>
                <div className="hole"></div>
              </div>
            </div>
          </div>
          <div className="film-strip-moving"></div>
        </div>
        
        {/* Bouncing Popcorn */}
        <div className="popcorn-container">
          <div className="popcorn piece1">🍿</div>
          <div className="popcorn piece2">🍿</div>
          <div className="popcorn piece3">🍿</div>
          <div className="popcorn piece4">🍿</div>
        </div>
      </div>
      
      <div className="loading-text">
        <span className="loading-message">{message}</span>
        <div className="buffering-bar">
          <div className="buffering-progress"></div>
        </div>
      </div>
    </div>
  );
};