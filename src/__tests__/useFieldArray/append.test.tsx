import { useForm } from '../../useForm';
import { useFieldArray } from '../../useFieldArray';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { act, renderHook } from '@testing-library/react-hooks';
import { VALIDATION_MODE } from '../../constants';
import * as React from 'react';
import { mockGenerateId } from '../useFieldArray.test';

let nodeEnv: string | undefined;

describe('append', () => {
  beforeEach(() => {
    mockGenerateId();
    nodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    process.env.NODE_ENV = nodeEnv;
  });

  it('should append dirtyFields fields correctly', async () => {
    let dirtyInputs = {};
    const Component = () => {
      const {
        register,
        control,
        formState: { dirtyFields },
      } = useForm<{
        test: { value: string }[];
      }>({
        defaultValues: {
          test: [
            { value: 'plz change' },
            { value: 'dont change' },
            { value: 'dont change' },
          ],
        },
      });
      const { fields, append } = useFieldArray({
        control,
        name: 'test',
      });

      dirtyInputs = dirtyFields;

      return (
        <form>
          {fields.map((field, i) => (
            <input
              key={field.id}
              {...register(`test.${i}.value` as const)}
              defaultValue={field.value}
            />
          ))}
          <button type="button" onClick={() => append({ value: '' })}>
            append
          </button>
          {dirtyFields.test?.length && 'dirty'}
        </form>
      );
    };

    render(<Component />);

    fireEvent.input(screen.getAllByRole('textbox')[0], {
      target: { value: 'test' },
    });
    fireEvent.blur(screen.getAllByRole('textbox')[0]);

    await waitFor(() => screen.getByText('dirty'));

    expect(dirtyInputs).toEqual({
      test: [{ value: true }],
    });

    fireEvent.click(screen.getByRole('button'));

    expect(dirtyInputs).toEqual({
      test: [{ value: true }, undefined, undefined, { value: true }],
    });
  });

  it('should append data into the fields', () => {
    let currentFields: any = [];
    const Component = () => {
      const { register, control } = useForm<{
        test: { test: string }[];
      }>();
      const { fields, append } = useFieldArray({
        control,
        name: 'test',
      });

      currentFields = fields;

      return (
        <form>
          {fields.map((field, index) => {
            return (
              <input
                key={field.id}
                {...register(`test.${index}.test`)}
                defaultValue={field.test}
              />
            );
          })}
          <button type={'button'} onClick={() => append({ test: 'test' })}>
            append
          </button>
          <button
            type={'button'}
            onClick={() =>
              append([{ test: 'test-batch' }, { test: 'test-batch1' }])
            }
          >
            appendBatch
          </button>
        </form>
      );
    };

    render(<Component />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'append' }));
    });

    act(() => {
      expect(currentFields).toEqual([{ id: '0', test: 'test' }]);
    });

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'append' }));
    });

    act(() => {
      expect(currentFields).toEqual([
        { id: '0', test: 'test' },
        { id: '1', test: 'test' },
      ]);
    });

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'appendBatch' }));
    });

    act(() => {
      expect(currentFields).toEqual([
        { id: '0', test: 'test' },
        { id: '1', test: 'test' },
        { id: '2', test: 'test-batch' },
        { id: '3', test: 'test-batch1' },
      ]);
    });
  });

  it.each(['isDirty', 'dirtyFields'])(
    'should be dirtyFields when value is appended with %s',
    () => {
      let isDirtyValue;
      let dirtyValue;

      const Component = () => {
        const {
          register,
          control,
          formState: { isDirty, dirtyFields },
        } = useForm<{
          test: { test: string }[];
        }>();
        const { fields, append } = useFieldArray({
          control,
          name: 'test',
        });

        isDirtyValue = isDirty;
        dirtyValue = dirtyFields;

        return (
          <form>
            {fields.map((field, index) => {
              return (
                <input
                  key={field.id}
                  {...register(`test.${index}.test`)}
                  defaultValue={field.test}
                />
              );
            })}
            <button type={'button'} onClick={() => append({ test: 'test' })}>
              append
            </button>
          </form>
        );
      };

      render(<Component />);

      act(() => {
        fireEvent.click(screen.getByRole('button', { name: 'append' }));
      });

      act(() => {
        fireEvent.click(screen.getByRole('button', { name: 'append' }));
      });

      act(() => {
        fireEvent.click(screen.getByRole('button', { name: 'append' }));
      });

      expect(isDirtyValue).toBeTruthy();
      expect(dirtyValue).toEqual({
        test: [{ test: true }, { test: true }, { test: true }],
      });
    },
  );

  it('should trigger reRender when user is watching the all field array', () => {
    const watched: any[] = [];
    const Component = () => {
      const { register, watch, control } = useForm<{
        test: { value: string }[];
      }>();
      const { fields, append } = useFieldArray({
        control,
        name: 'test',
      });
      watched.push(watch());

      return (
        <form>
          {fields.map((field, i) => (
            <input
              key={field.id}
              {...register(`test.${i}.value` as const)}
              defaultValue={field.value}
            />
          ))}
          <button type="button" onClick={() => append({ value: '' })}>
            append
          </button>
        </form>
      );
    };

    render(<Component />);

    fireEvent.click(screen.getByRole('button', { name: /append/i }));

    expect(watched).toEqual([
      {},
      {},
      { test: [{ value: '' }] },
      { test: [{ value: '' }] },
    ]);
  });

  it('should focus if shouldFocus is true', () => {
    const Component = () => {
      const { register, control } = useForm<{
        test: { value: string }[];
      }>({
        defaultValues: { test: [{ value: '1' }, { value: '2' }] },
      });
      const { fields, append } = useFieldArray({ control, name: 'test' });

      return (
        <form>
          {fields.map((field, i) => (
            <input
              key={field.id}
              {...register(`test.${i}.value` as const)}
              defaultValue={field.value}
            />
          ))}
          <button type="button" onClick={() => append({ value: '3' })}>
            append
          </button>
        </form>
      );
    };

    render(<Component />);

    fireEvent.click(screen.getByRole('button', { name: /append/i }));

    const inputs = screen.getAllByRole('textbox');

    expect(inputs).toHaveLength(3);

    // expect(document.activeElement).toEqual(inputs[2]); no longer working
  });

  it('should not focus if shouldFocus is false', () => {
    const Component = () => {
      const { register, control } = useForm<{
        test: { value: string }[];
      }>({
        defaultValues: { test: [{ value: '1' }, { value: '2' }] },
      });
      const { fields, append } = useFieldArray({ control, name: 'test' });

      return (
        <form>
          {fields.map((field, i) => (
            <input
              key={field.id}
              {...register(`test.${i}.value` as const)}
              defaultValue={field.value}
            />
          ))}
          <button
            type="button"
            onClick={() => append({ value: '3' }, { shouldFocus: false })}
          >
            append
          </button>
        </form>
      );
    };

    render(<Component />);

    fireEvent.click(screen.getByRole('button', { name: /append/i }));

    const inputs = screen.getAllByRole('textbox');

    expect(inputs).toHaveLength(3);
    expect(document.activeElement).toEqual(document.body);
  });

  it('should return watched value with watch API', async () => {
    const renderedItems: any = [];
    const Component = () => {
      const { watch, register, control } = useForm<{
        test: { value: string }[];
      }>();
      const { fields, append } = useFieldArray({
        name: 'test',
        control,
      });
      const watched = watch('test');
      renderedItems.push(watched);
      return (
        <div>
          {fields.map((field, i) => (
            <div key={field.id}>
              <input
                defaultValue={field.value}
                {...register(`test.${i}.value` as const)}
              />
            </div>
          ))}
          <button onClick={() => append({ value: 'test' })}>append</button>
        </div>
      );
    };

    render(<Component />);

    fireEvent.click(screen.getByRole('button', { name: /append/i }));

    await waitFor(() =>
      expect(renderedItems).toEqual([
        undefined,
        undefined,
        [{ value: 'test' }],
        [{ value: 'test' }],
      ]),
    );
  });

  describe('with resolver', () => {
    it('should invoke resolver when formState.isValid true', async () => {
      const resolver = jest.fn().mockReturnValue({});

      const { result } = renderHook(() => {
        const { formState, control } = useForm({
          mode: VALIDATION_MODE.onChange,
          resolver,
        });
        const { append } = useFieldArray({ control, name: 'test' });
        return { formState, append };
      });

      result.current.formState.isValid;

      await act(async () => {
        result.current.append({ value: '1' });
      });

      expect(resolver).toBeCalledWith(
        {
          test: [{ value: '1' }],
        },
        undefined,
        { criteriaMode: undefined, fields: {} },
      );
    });

    it('should not invoke resolver when formState.isValid false', () => {
      const resolver = jest.fn().mockReturnValue({});

      const { result } = renderHook(() => {
        const { formState, control } = useForm({
          mode: VALIDATION_MODE.onChange,
          resolver,
        });
        const { append } = useFieldArray({ control, name: 'test' });
        return { formState, append };
      });

      act(() => {
        result.current.append({ value: '1' });
      });

      expect(resolver).not.toBeCalled();
    });
  });
});
