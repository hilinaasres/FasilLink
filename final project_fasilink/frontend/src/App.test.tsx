import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the FasilLink marketplace landing page', () => {
  render(<App />);

  expect(document.body).toHaveTextContent(/FasilLink/i);
  expect(document.body).toHaveTextContent(/Search listings/i);
});
