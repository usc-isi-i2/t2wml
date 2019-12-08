import React from 'react';
import './App.css';
// import * as utils from '../utils'
import T2WMLLogo from '../index/T2WMLLogo'

// App
import { Navbar } from 'react-bootstrap';

// http://patorjk.com/software/taag/#p=display&f=Doh&t=App
//                AAA                                                      
//               A:::A                                                     
//              A:::::A                                                    
//             A:::::::A                                                   
//            A:::::::::A          ppppp   ppppppppp   ppppp   ppppppppp   
//           A:::::A:::::A         p::::ppp:::::::::p  p::::ppp:::::::::p  
//          A:::::A A:::::A        p:::::::::::::::::p p:::::::::::::::::p 
//         A:::::A   A:::::A       pp::::::ppppp::::::ppp::::::ppppp::::::p
//        A:::::A     A:::::A       p:::::p     p:::::p p:::::p     p:::::p
//       A:::::AAAAAAAAA:::::A      p:::::p     p:::::p p:::::p     p:::::p
//      A:::::::::::::::::::::A     p:::::p     p:::::p p:::::p     p:::::p
//     A:::::AAAAAAAAAAAAA:::::A    p:::::p    p::::::p p:::::p    p::::::p
//    A:::::A             A:::::A   p:::::ppppp:::::::p p:::::ppppp:::::::p
//   A:::::A               A:::::A  p::::::::::::::::p  p::::::::::::::::p 
//  A:::::A                 A:::::A p::::::::::::::pp   p::::::::::::::pp  
// AAAAAAA                   AAAAAAAp::::::pppppppp     p::::::pppppppp    
//                                  p:::::p             p:::::p            
//                                  p:::::p             p:::::p            
//                                 p:::::::p           p:::::::p           
//                                 p:::::::p           p:::::::p           
//                                 p:::::::p           p:::::::p           
//                                 ppppppppp           ppppppppp      

class App extends React.Component {
  constructor(props) {
    super(props);

    // init app
    this.state = {

    };
  }

  render() {
    return (
      <div>

        {/* navbar */}
        <div>
          <Navbar className="shadow" bg="dark" variant="dark" sticky="top" style={{ height: "50px" }}>

            {/* logo */}
            <T2WMLLogo />

          </Navbar>
        </div>

        {/* content */}
        <div>
          {/* nothing */}
        </div>
      </div>
    );
  }
}

export default App;
