import React from 'react'
import './App.css'
import {
  QueryClient,
  QueryClientProvider,
  useQuery
} from '@tanstack/react-query'
import axios from 'axios'
import { produce } from 'immer'
import * as R from 'ramda'
import { z } from 'zod'

const queryClient = new QueryClient()
const LOCAL_STORAGE_KEY = 'react-shopping-list'

const noteSchema = z.object({
  isOpen: z.boolean(),
  text: z.string()
})

const listItemSchema = z.object({
  label: z.string().min(1),
  isSelected: z.boolean(),
  notes: noteSchema,
  quantity: z.number().min(1).positive()
})

type ListItem = z.infer<typeof listItemSchema>

// type Note = z.infer<typeof noteSchema>

const shoppingListStateSchema = z.object({
  items: z.array(listItemSchema),
  resultsAreVisible: z.boolean(),
  searchInput: z.string()
})

type ShoppingListState = z.infer<typeof shoppingListStateSchema>

type ShoppingListAction =
  | { type: 'ChangeItemQuantity'
      change: number
      itemLabel: string
    }
  | { type: 'DeletedItem'
      itemIndex: number
    }
  | { type: 'SetItem'
      itemLabel: string
    }
  | { type: 'SetSearchInput'
      searchInput: string
    }
  | { type: 'ToggledItem'
      itemIndex: number
    }
  | { type: 'ToggledNote'
      itemIndex: number
    }
  | { type: 'UpdateNoteText'
      itemIndex: number
      text: string
    }

function shoppingListReducer(state:ShoppingListState, action:ShoppingListAction):ShoppingListState {
  switch (action.type) {
    case 'ChangeItemQuantity': {
      const updatedItems =
        produce(state.items, draft =>{
          draft.map((item) =>{
            if (item.label === action.itemLabel) {
              item.quantity = item.quantity + action.change
            } else {
              item
            }
          })
        })
      
      return { ...state, items: updatedItems }
    }

    case 'DeletedItem': {
      const updatedItems =
        produce(state.items, (draft) =>{
          draft.splice(action.itemIndex, 1)
        })

      return { ...state, items: updatedItems }
    }
    
    case 'SetItem': {
      return { ...state,
          items:
            [
              { label: action.itemLabel,
                isSelected: false,
                notes: { isOpen: false, text: '' },
                quantity: 1
              },
              ...state.items
            ],
          resultsAreVisible: false 
        }
    }
    
    case 'SetSearchInput': {
      return { ...state, resultsAreVisible: true, searchInput: action.searchInput }
    }

    case 'ToggledItem': {
      const updatedItems =
        produce(state.items, (draft) =>{
          draft[action.itemIndex].isSelected = !draft[action.itemIndex].isSelected
        })
       
      return {...state, items: updatedItems }
    }

    case 'ToggledNote': {
      const updatedItems =
        produce(state.items, draft => {
          draft[action.itemIndex].notes.isOpen = !draft[action.itemIndex].notes.isOpen
        })
       
      return {...state, items: updatedItems }
    }
  
    case 'UpdateNoteText': {
      const updatedItems =
        produce(state.items, draft => {
          draft[action.itemIndex].notes.text = action.text
        })
       
      return {...state, items: updatedItems }
    }
  }
}

function App() {
  const emptyState:ShoppingListState =
    { items: [],
      searchInput: '',
      resultsAreVisible: false
    }

  

  const savedStateString:unknown =
    JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_KEY) || JSON.stringify(emptyState))
    
  const parsedState = shoppingListStateSchema.safeParse(savedStateString)
  
  const intialState:ShoppingListState = parsedState.success
    ? parsedState.data
    : emptyState
  
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  
  const [state, dispatch] = React.useReducer(shoppingListReducer, intialState)
  
  const handleDeleteItem = React.useCallback(
    (itemIndex:number) => {
      dispatch({ type: 'DeletedItem', itemIndex: itemIndex})
    }, [state.items])
  
  const handleSetListItem = React.useCallback (
    (itemLabel:string) => {
      const itemExistsInList = R.any((item_:ListItem) => item_.label == itemLabel)(state.items)
      if (itemExistsInList) {
        dispatch({ type: 'ChangeItemQuantity', change: +1, itemLabel: itemLabel })
      } else {
        dispatch({ type: 'SetItem', itemLabel: itemLabel})
        if (searchInputRef.current) {
          searchInputRef.current.focus()
        }
      }
    }, [state.items])
    
  const handleSetSearchInput = React.useCallback (
    (searchInput:string) => {
      dispatch({ type: 'SetSearchInput', searchInput: searchInput})
    }, [state.searchInput, state.resultsAreVisible])
    
  const handleToggleItem = React.useCallback (
    (itemIndex:number) => {
      dispatch({ type: 'ToggledItem', itemIndex: itemIndex})
    }, [state.items])

  const handleToggleNote = React.useCallback (
    (itemIndex:number) => {
      dispatch({ type: 'ToggledNote', itemIndex: itemIndex})
    }, [state.items])

  const handleUpdateNoteText = React.useCallback (
    (itemIndex:number, noteText:string) => {
      dispatch({ type: 'UpdateNoteText', itemIndex: itemIndex, text: noteText})
    }, [state.items])

  React.useEffect(() => {
    localStorage.setItem( LOCAL_STORAGE_KEY, JSON.stringify(state) )
  }, [state])
  
  return (
    <div className='w-screen h-screen bg-gray-200'>
      <div className='flex flex-col justify-items-center mx-auto w-96'>
        <h1 className='text-3xl font-bold text-center my-6' >My Shopping List</h1>
        <div className='flex flex-col dropdown focus-within:dropdown-open'>
          <SearchInput itemQuery={state.searchInput} ref={searchInputRef} setSearchInput={(input:string) => handleSetSearchInput(input)} />
          <QueryClientProvider client={queryClient}>
            <SearchResults itemQuery={state.searchInput} handleSetListItem={handleSetListItem} visible={state.resultsAreVisible} />
          </QueryClientProvider>
        </div>
        <ShoppingList
          handleDeleteItem={handleDeleteItem}
          handleToggleItem={handleToggleItem}
          handleToggleNote={handleToggleNote}
          handleUpdateNoteText={handleUpdateNoteText}
          listItems={state.items}
        />
      </div>
    </div>
  )
}


interface SearchInputProps {
  itemQuery: string
  setSearchInput: (searchInput: string) => void
}

const SearchInput = React.forwardRef(({ itemQuery, setSearchInput }:SearchInputProps,  ref:React.ForwardedRef<HTMLInputElement>) => { 
  return(
    <input
      className='w-full input input-bordered'
      ref={ref}
      type='text'
      value={itemQuery}
      name='searchInput'
      placeholder='Search'
      onChange={
        (event:React.ChangeEvent<HTMLInputElement>)=> {
          setSearchInput(event.target.value)
        }
      }
    />
  )
})

function useFoodQuery(itemQuery:string) {
  return useQuery({
    queryKey: [itemQuery],
    queryFn: async () => {
      const { data } = await axios.get(`https://api.frontendeval.com/fake/food/${itemQuery}`)
      return data
    },
    enabled: itemQuery.length > 1
  })
}

interface SearchResultProps {
  itemQuery: string
  handleSetListItem:(itemLabel: string) => void
  visible: boolean
}

function SearchResults({ itemQuery, handleSetListItem, visible }:SearchResultProps) {
    const { status, data, error, isFetching } = useFoodQuery(itemQuery)
    return (
      <div className={`mx-2 relative${visible? '' : ' hidden'}`}>
        { status == 'error' ? ( <span>`Error: ${error.message}`</span> )
          : status == 'pending' ? ( <span>{isFetching ? `Loading...` : ``}</span> )
          : <ul className='dropdown-content z-[1] shadow bg-base-100 w-full' role='menu' aria-orientation='vertical' aria-labelledby='menu-button' tabIndex={-1}>
              { data.map((searchResult: string) => {
                  return (
                    <li
                      className='text-gray-700 text-sm'
                      role='menuitem'
                      tabIndex={-1}
                      key={searchResult}
                    >
                      <button onClick={() => handleSetListItem(searchResult)} className='btn btn-ghost rounded-none w-full'>
                      {searchResult}
                      </button>
                    </li>
                  )
                })
              }
            </ul>
        }
      </div>
    )
}

interface ShoppongListProps {
  handleDeleteItem: (itemIndex: number) => void
  handleToggleItem: (itemIndex: number) => void
  handleToggleNote: (itemIndex: number) => void
  handleUpdateNoteText: (itemIndex: number, noteText:string) => void
  listItems: ListItem[]
}

function ShoppingList({handleDeleteItem, handleToggleItem, handleToggleNote, handleUpdateNoteText, listItems}:ShoppongListProps) {
  
  return(
    <ul className='mt-10'>
      { listItems.map((listItem, itemIndex) =>{
          return (
            <li
              key={listItem.label}
              className={`w-full card bg-base-100 mb-4 shadow-sm hover:shadow-lg ${listItem.isSelected ? 'opacity-50' : ''}`}
            >
              <div className='card-body p-4 flex flex-col'>
                <div className='flex flex-row'>
                  <div className='form-control flex flex-row justify-start flex-1'>
                    <label className='label cursor-pointer'>
                      <input
                        type='checkbox'
                        checked={listItem.isSelected}
                        className='checkbox'
                        name='item-checkbox'
                        onChange={() => handleToggleItem(itemIndex)}/>
                      <span
                        className={`label-text ml-4 ${listItem.isSelected ? 'line-through' : ''}`}>
                        {listItem.quantity} - {listItem.label}
                      </span> 
                    </label>
                  </div>
                  { listItem.notes.isOpen
                    ? <></>
                    : <div className='flex flex-row gap-2 items-center'>
                        <button
                          className='btn btn-sm btn-circle btn-outline p-1 flex content-center'
                          onClick={() => handleToggleNote(itemIndex)}>
                          <svg
                            fill='none'
                            height='24'
                            stroke='currentColor'
                            stroke-linecap='round'
                            stroke-linejoin='round'
                            stroke-width='2'
                            viewBox='0 0 24 24'
                            width='24'
                            xmlns='http://www.w3.org/2000/svg'>
                            <path d='M12 20h9'/><path d='M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z'/>
                          </svg>
                        </button>
                        <button
                          className='btn btn-sm btn-circle btn-outline'
                          onClick={() => handleDeleteItem(itemIndex)}>
                          <svg
                            xmlns='http://www.w3.org/2000/svg'
                            className='h-3 w-3'
                            fill='none'
                            viewBox='0 0 24 24'
                            stroke='currentColor'>
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M6 18L18 6M6 6l12 12' />
                          </svg>
                        </button>
                      </div>
                  }
                </div>
                { listItem.notes.isOpen ?
                  <div>
                    <label className='form-control mt-2 mb-4'>
                      <div className='label'>
                        <span className='label-text-alt'>Notes</span>
                      </div>
                      <textarea
                        onChange={(e) => handleUpdateNoteText(itemIndex, e.target.value)}
                        className='textarea textarea-bordered h-24'
                        placeholder='Save details about the item here'
                        ></textarea>
                    </label>
                    <div className='grid justify-items-end'>
                      <button
                        className='btn'
                        onClick={() => handleToggleNote(itemIndex)}>
                          Done
                        </button>
                    </div>
                  </div>
                  : <></>
                }
              </div>
            </li>
          )
        })
      }
    </ul>
    )
}


export default App
