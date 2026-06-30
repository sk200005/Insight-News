import React, { useMemo } from "react";

function FlipText({
  className = "",
  children,
  duration = 2.2,
  delay = 0,
  loop = true,
  separator = " ",
  together = false,
}) {
  const words = useMemo(() => children.split(separator), [children, separator]);
  const totalChars = Math.max(children.length, 1);

  const getCharIndex = (wordIndex, charIndex) => {
    let index = 0;

    for (let currentWord = 0; currentWord < wordIndex; currentWord += 1) {
      index += words[currentWord].length + (separator === " " ? 1 : separator.length);
    }

    return index + charIndex;
  };

  return (
    <span
      className={`flip-text-wrapper inline-block leading-none ${className}`.trim()}
      style={{ perspective: "1000px" }}
      aria-label={children}
    >
      <span aria-hidden="true">
        {words.map((word, wordIndex) => (
          <span
            key={`${word}-${wordIndex}`}
            className="flip-word inline-block whitespace-nowrap"
            style={{ transformStyle: "preserve-3d" }}
          >
            {word.split("").map((char, charIndex) => {
              const currentGlobalIndex = getCharIndex(wordIndex, charIndex);
              const normalizedIndex = currentGlobalIndex / totalChars;
              const stagger = together
                ? 0
                : Math.sin(normalizedIndex * (Math.PI / 2)) * (duration * 0.25);

              return (
                <span
                  key={`${char}-${charIndex}`}
                  className="flip-char relative inline-block"
                  data-char={char}
                  style={{
                    "--flip-duration": `${duration}s`,
                    "--flip-delay": `${delay + stagger}s`,
                    "--flip-iteration": loop ? "infinite" : "1",
                    transformStyle: "preserve-3d",
                  }}
                >
                  {char}
                </span>
              );
            })}

            {wordIndex < words.length - 1 && (
              <span className="inline-block">
                {separator === " " ? "\u00a0" : separator}
              </span>
            )}
          </span>
        ))}
      </span>
    </span>
  );
}

export default FlipText;
