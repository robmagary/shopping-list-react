import React, { useCallback, useState } from 'react'
import './App.css'
import {
  QueryClient,
  QueryClientProvider,
  useQuery
} from '@tanstack/react-query'
import axios from 'axios'
import { produce } from 'immer'

const queryClient = new QueryClient()

interface FoodItem {
  label: string
  isSelected: boolean
}

function App() {
  const [listItems, setListItems] = useState<FoodItem[]>([])
  const handleSetFoodItem = useCallback (
    (foodLabel:string) => {
    setListItems([
      ...listItems,
      { label: foodLabel, isSelected: false }
    ])
  }, [listItems])
  const handleToggleItem = useCallback (
    (itemIndex:number) => {
    setListItems(
      produce(listItems, (draft) =>{
        draft[itemIndex].isSelected = !draft[itemIndex].isSelected
      })
    )
  }, [listItems])
  const handleDeleteItem = useCallback(
  (itemIndex:number) => {
    setListItems(
      produce(listItems, (draft) =>{
        draft.splice(itemIndex, 1)
      })
    )
  }, [listItems])
  return (
    <div className='flex flex-col justify-items-center mx-auto w-96'>
      <h1 className='text-3xl font-bold text-center my-6' >My Shopping List</h1>
      <Search handleSetFoodItem={handleSetFoodItem}/>
      <ShoppingList handleDeleteItem={handleDeleteItem} handleToggleItem={handleToggleItem} listItems={listItems}/>
    </div>
  )
}

interface SearchProps {
  handleSetFoodItem:(foodLabel: string) => void
}

function Search({ handleSetFoodItem }:SearchProps) {
  const [foodQuery, setFoodQuery] = useState('')
  return (
    <div className='flex flex-col dropdown focus-within:dropdown-open'>
      <SearchInput foodQuery={foodQuery} setFoodQuery={setFoodQuery} />
      <QueryClientProvider client={queryClient}>
        <SearchResults foodQuery={foodQuery} handleSetFoodItem={handleSetFoodItem} />
      </QueryClientProvider>
    </div>
  )
}

interface SearchInputProps {
  foodQuery: string
  setFoodQuery: React.Dispatch<React.SetStateAction<string>>
}

function SearchInput({ foodQuery, setFoodQuery }:SearchInputProps) {
  return(
    <input
      className='w-full input input-bordered'
      type='text'
      value={foodQuery}
      onChange={
        (event:React.ChangeEvent<HTMLInputElement>)=> {
          const foodQueryInput = event.target.value
          setFoodQuery(foodQueryInput)
        }
      }
    />
  )
}

function useFoodQuery(foodQuery:string) {
  return useQuery({
    queryKey: [foodQuery],
    queryFn: async () => {
      const { data } = await axios.get(`https://api.frontendeval.com/fake/food/${foodQuery}`)
      return data
    },
    enabled: foodQuery.length > 1
  })
}

interface SearchResultProps {
  foodQuery: string
  handleSetFoodItem:(foodLabel: string) => void
}

function SearchResults({ foodQuery, handleSetFoodItem }:SearchResultProps) {
    const { status, data, error, isFetching } = useFoodQuery(foodQuery)
    return (
      <div className='mx-2 relative'>
        { status == 'error' ? ( <span>`Error: ${error.message}`</span> )
          : status == 'pending' ? ( <span>{isFetching ? `Loading...` : ``}</span> )
          : <ul className='dropdown-content z-[1] shadow bg-base-100 w-full' role='menu' aria-orientation='vertical' aria-labelledby='menu-button' tabIndex={-1}>
              { data.map((searchResult: string, index :number) => {
                  return (
                    <li
                      className='text-gray-700 text-sm'
                      role='menuitem'
                      tabIndex={-1}
                      key={index}
                      onClick={() => handleSetFoodItem(searchResult)}
                    >
                      <button className='btn btn-ghost rounded-none w-full'>
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
  listItems: FoodItem[]
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
