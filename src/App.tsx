import React, { useEffect, useState } from 'react'
import './App.css'
import {
  QueryClient,
  QueryClientProvider,
  useQuery
} from '@tanstack/react-query'
import axios from 'axios'

const queryClient = new QueryClient()

function App() {
  return (
      <div className="flex flex-col justify-items-center mx-auto w-96">
        <h1 className='text-3xl font-bold text-center my-6' >My Shopping List</h1>
        <Search/>
      </div>
  )
}


function Search() {
  const [foodQuery, setFoodQuery] = useState('')
  return (
    <div className=''>
      <SearchInput foodQuery={foodQuery} setFoodQuery={setFoodQuery} />
      <QueryClientProvider client={queryClient}>
        <SearchResults foodQuery={foodQuery}/>
      </QueryClientProvider>
    </div>
  )
}

interface SearchProps {
  foodQuery: string
  setFoodQuery: React.Dispatch<React.SetStateAction<string>>
}

function SearchInput({ foodQuery, setFoodQuery }:SearchProps) {
  return(
    <input
      className='block w-full rounded-md border-0 p-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6'
      type="text"
      value={foodQuery}
      onChange={
        (event:React.ChangeEvent<HTMLInputElement>)=> {
          const foodQueryInput = event.target.value
          console.log('foodQueryInput', foodQueryInput)
          setFoodQuery(foodQueryInput)
        }
      }
    />
  )
}

function useFoodQuery(foodQuery:string) {
  console.log('useFoodQuery: ', foodQuery)
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
}

function SearchResults({ foodQuery }:SearchResultProps) {
    const { status, data, error, isFetching } = useFoodQuery(foodQuery)
    return (
      <div className="relative">
        { status == 'error' ? ( <span>`Error: ${error.message}`</span> )
          : status == 'pending' ? ( <span>{isFetching ? `Loading...` : ``}</span> )
          : <ul className="absolute left-0 w-full z-10 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none" role="menu" aria-orientation="vertical" aria-labelledby="menu-button" tabIndex={-1}>
                  { data.map((searchResult: string, index :number) => {
                      return <li className="text-gray-700 px-4 py-2 text-sm" role="menuitem" tabIndex={-1} key={index}>{searchResult}</li>
                    })
                  }
            </ul>
        }
      </div>
    )
}

export default App
