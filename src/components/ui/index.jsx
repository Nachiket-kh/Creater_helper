import React from 'react';
import './ui.css';

const cx = (...parts) => parts.filter(Boolean).join(' ');

export function Button({ variant = 'primary', size = 'md', className, type = 'button', ...props }) {
  return <button type={type} className={cx('ui-button', `ui-button--${variant}`, `ui-button--${size}`, className)} {...props} />;
}

export function Card({ className, ...props }) { return <section className={cx('ui-card', className)} {...props} />; }
export function CardHeader({ className, ...props }) { return <header className={cx('ui-card__header', className)} {...props} />; }
export function CardTitle({ className, ...props }) { return <h2 className={cx('ui-card__title', className)} {...props} />; }
export function CardDescription({ className, ...props }) { return <p className={cx('ui-card__description', className)} {...props} />; }
export function CardContent({ className, ...props }) { return <div className={cx('ui-card__content', className)} {...props} />; }
export function CardFooter({ className, ...props }) { return <footer className={cx('ui-card__footer', className)} {...props} />; }

export function Label({ className, ...props }) { return <label className={cx('ui-label', className)} {...props} />; }
export function Input({ className, ...props }) { return <input className={cx('ui-input', className)} {...props} />; }
export function Textarea({ className, ...props }) { return <textarea className={cx('ui-textarea', className)} {...props} />; }
export function Badge({ tone = 'indigo', className, ...props }) { return <span className={cx('ui-badge', `ui-badge--${tone}`, className)} {...props} />; }
export function Avatar({ initials, name, className, ...props }) {
  const label = name || initials || 'User';
  return <span className={cx('ui-avatar', className)} role="img" aria-label={label} {...props}>{initials || name?.split(/\s+/).map((part) => part[0]).slice(0, 2).join('') || '?'}</span>;
}
