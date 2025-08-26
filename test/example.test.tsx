import { describe, it, expect } from 'vitest';
import { render, screen } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';

// 示例组件测试
const Counter = () => {
  const [count, setCount] = createSignal(0);
  
  return (
    <div>
      <p data-testid="count">Count: {count()}</p>
      <button onClick={() => setCount(count() + 1)}>Increment</button>
    </div>
  );
};

describe('Counter Component', () => {
  it('should render initial count', () => {
    render(() => <Counter />);
    const countElement = screen.getByTestId('count');
    expect(countElement).toHaveTextContent('Count: 0');
  });

  it('should increment count when button is clicked', async () => {
    const { container } = render(() => <Counter />);
    const button = container.querySelector('button');
    
    button?.click();
    
    const countElement = screen.getByTestId('count');
    expect(countElement).toHaveTextContent('Count: 1');
  });
});

// 示例纯函数测试
describe('Math functions', () => {
  it('should add two numbers correctly', () => {
    const add = (a: number, b: number) => a + b;
    expect(add(2, 3)).toBe(5);
  });
});