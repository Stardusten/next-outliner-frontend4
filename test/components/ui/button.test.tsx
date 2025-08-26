import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('should render button with text', () => {
    render(() => <Button>Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Click me');
  });

  it('should apply variant classes', () => {
    render(() => <Button variant="destructive">Delete</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('destructive');
  });

  it('should handle click events', () => {
    const handleClick = vi.fn();
    render(() => <Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(() => <Button disabled>Disabled</Button>);
    const button = screen.getByRole('button') as HTMLButtonElement;
    
    expect(button.disabled).toBe(true);
  });
});