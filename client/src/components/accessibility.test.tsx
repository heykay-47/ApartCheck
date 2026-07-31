import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FormField } from './FormField'

describe('shared accessibility primitives', () => {
  it('associates field errors with invalid controls', () => {
    render(
      <FormField label="Email" error="Enter a valid email.">
        {(id) => <input id={id} />}
      </FormField>,
    )

    const input = screen.getByLabelText('Email')
    const error = screen.getByText('Enter a valid email.')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', error.id)
    expect(error).toHaveAttribute('role', 'alert')
  })
})
