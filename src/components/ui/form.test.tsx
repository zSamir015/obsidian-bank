import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Field, Input, MoneyInput, Select } from './form'

describe('Field', () => {
  it('connects label, hint and error to the control', () => {
    render(
      <Field label="Note" hint="Up to 140 characters." error="Keep it under 140 characters.">
        {(props) => <Input {...props} />}
      </Field>,
    )
    const input = screen.getByRole('textbox', { name: 'Note' })
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Up to 140 characters. Keep it under 140 characters.')
  })

  it('shows the error with an icon and text, not color alone', () => {
    render(
      <Field label="Amount" error="Enter an amount greater than $0.00.">
        {(props) => <Input {...props} />}
      </Field>,
    )
    const error = screen.getByText('Enter an amount greater than $0.00.')
    expect(error.closest('p')!.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('is valid by default', () => {
    render(<Field label="Note">{(props) => <Input {...props} />}</Field>)
    expect(screen.getByRole('textbox', { name: 'Note' })).toHaveAttribute('aria-invalid', 'false')
  })
})

describe('MoneyInput', () => {
  it('asks for a decimal keypad and shows a dollar prefix outside the value', async () => {
    render(<Field label="Amount">{(props) => <MoneyInput {...props} />}</Field>)
    const input = screen.getByRole('textbox', { name: 'Amount' })
    expect(input).toHaveAttribute('inputmode', 'decimal')
    await userEvent.type(input, '25.50')
    expect(input).toHaveValue('25.50')
    expect(screen.getByText('$')).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('Select', () => {
  it('renders a native select for full keyboard and screen reader support', () => {
    render(
      <Field label="From">
        {(props) => (
          <Select {...props}>
            <option value="a">Everyday Checking</option>
          </Select>
        )}
      </Field>,
    )
    expect(screen.getByRole('combobox', { name: 'From' })).toBeInTheDocument()
  })
})
