using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace FibonacciNumbers
{
    class Program
    {
        static void Main(string[] args)
        {
            int[] fib = new int[33];
            fib[0] = 0;
            fib[1] = 1;
            for (int i = 2; i < 33; i++)
            {
                fib[i] = fib[i-2] + fib[i-1];
                Console.WriteLine(string.Format("fib {0} = {1}", i, fib[i]));
            }

            Console.ReadLine();
        }
    }
}
