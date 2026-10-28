import { Fragment, type ElementType, type HTMLAttributes } from 'react';

type Props = HTMLAttributes<HTMLElement> & {
  text: string;
  as?: ElementType;
  by?: 'word' | 'char';
  [data: `data-${string}`]: string | undefined;
};

/**
 * Splits text into words (or characters) wrapped in masks so GSAP can "pop" them in.
 * Normal spaces sit between word masks so lines wrap naturally.
 * The full text stays in an aria-label so screen readers read it normally.
 */
export default function Split({ text, as: Tag = 'span', by = 'word', className, ...rest }: Props) {
  const words = text.split(' ');
  return (
    <Tag {...rest} className={`split ${className ?? ''}`} aria-label={text}>
      {words.map((w, i) => (
        <Fragment key={`${w}-${i}`}>
          <span className="split__mask" aria-hidden="true">
            {by === 'word' ? (
              <span className="split__item">{w}</span>
            ) : (
              [...w].map((c, j) => <span className="split__item" key={j}>{c}</span>)
            )}
          </span>
          {i < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </Tag>
  );
}
