import React from 'react'
import './App.css'
import {
  QueryClient,
  QueryClientProvider,
  useQuery
} from '@tanstack/react-query'
import axios from 'axios'
import { produce } from 'immer'

const queryClient = new QueryClient()

interface ListItem {
  label: string
  isSelected: boolean
}

interface ShoppingListState {
  items: ListItem[]
  searchInput: string
}

type ShoppingListAction =
  | { type: 'DeletedItem';
      itemIndex:number;
    }
  | { type: 'SetItem';
      itemLabel:string;
    }
  | { type: 'SetSearchInput';
      searchInput:string;
    }
  | { type: 'ToggledItem';
      itemIndex:number;
    }

function shoppingListReducer(state:ShoppingListState, action:ShoppingListAction):ShoppingListState {
  switch (action.type) {
    case 'DeletedItem': {
      const updatedItems =
        produce(state.items, (draft) =>{
          draft.splice(action.itemIndex, 1)
        })
      const updatedState =
        produce(state, draft => {
          draft.items = updatedItems
        })
      
        return updatedState
    }
    
    case 'SetItem': {
      const updatedItems =
        [
          ...state.items,
          { label: action.itemLabel, isSelected: false }
        ]
      const updatedState =
        produce(state, draft => {
          draft.items = updatedItems
        })
      
        return updatedState
    }
    case 'SetSearchInput': {
      const updatedState =
        produce(state, draft => {
          draft.searchInput = action.searchInput
        })
      
        return updatedState
    }
    case 'ToggledItem': {
      const updatedItems =
        produce(state.items, (draft) =>{
          draft[action.itemIndex].isSelected = !draft[action.itemIndex].isSelected
        })
      const updatedState =
        produce(state, draft => {
          draft.items = updatedItems
        })
      
        return updatedState
    }
  }
}

function App() {
  const intialState = { items: [], searchInput: '' }
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  const [state, dispatch] = React.useReducer(shoppingListReducer, intialState)
  const handleDeleteItem = React.useCallback(
  (itemIndex:number) => {
    dispatch({ type: 'DeletedItem', itemIndex: itemIndex})
  }, [state.items])
  const handleSetListItem = React.useCallback (
    (itemLabel:string) => {
    dispatch({ type: 'SetItem', itemLabel: itemLabel})
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [state.items])
  const handleSetSearchInput = React.useCallback (
    (searchInput:string) => {
      dispatch({ type: 'SetSearchInput', searchInput: searchInput})
    }, [state.searchInput])
  const handleToggleItem = React.useCallback (
    (itemIndex:number) => {
    dispatch({ type: 'ToggledItem', itemIndex: itemIndex})
  }, [state.items])
  return (
    <div className='flex flex-col justify-items-center mx-auto w-96'>
      <h1 className='text-3xl font-bold text-center my-6' >My Shopping List</h1>
      <div className='flex flex-col dropdown focus-within:dropdown-open'>
        <SearchInput itemQuery={state.searchInput} ref={searchInputRef} setSearchInput={(input:string) => handleSetSearchInput(input)} />
        <QueryClientProvider client={queryClient}>
          <SearchResults itemQuery={state.searchInput} handleSetListItem={handleSetListItem} />
        </QueryClientProvider>
      </div>
      <ShoppingList handleDeleteItem={handleDeleteItem} handleToggleItem={handleToggleItem} listItems={state.items}/>
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
}

function SearchResults({ itemQuery, handleSetListItem }:SearchResultProps) {
    const { status, data, error, isFetching } = useFoodQuery(itemQuery)
    return (
      <div className='mx-2 relative'>
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
  listItems: ListItem[]
}

function ShoppingList({handleDeleteItem, handleToggleItem, listItems}:ShoppongListProps) {
  
  return(
    <ul className='mt-12'>
      { listItems.map((listItem, itemIndex) =>{
          return (
            <li key={listItem.label} className={`w-full p-4 flex flex-row justify-between items-center hover:shadow-sm ${listItem.isSelected ? 'opacity-50' : ''}`}>
                <div className='form-control flex flex-row justify-start flex-1'>
                  <label className='label cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={listItem.isSelected}
                      className='checkbox'
                      onChange={() => handleToggleItem(itemIndex)}/>
                    <span
                      className={`label-text ml-4 ${listItem.isSelected ? 'line-through' : ''}`}>
                      {listItem.label}
                    </span> 
                  </label>
                </div>
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
            </li>
          )
        })
      }
    </ul>
    )
}


export default App
